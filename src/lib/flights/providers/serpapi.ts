import type {
  FlightSearchProvider,
  FlightSearchParams,
  FlightOffer,
  FlightSegment,
} from "../types";

const SERPAPI_BASE = "https://serpapi.com/search.json";

interface SerpApiFlight {
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  departure_airport?: { name?: string; id?: string; time?: string };
  arrival_airport?: { name?: string; id?: string; time?: string };
  duration?: number; // minutes
  airplane?: string;
  travel_class?: string;
  legroom?: string;
  extensions?: string[];
  overnight?: boolean;
}

interface SerpApiResult {
  flights?: SerpApiFlight[];
  layovers?: { name?: string; duration?: number; id?: string }[];
  total_duration?: number;
  carbon_emissions?: { this_flight?: number };
  price?: number;
  type?: string;
  airline_logo?: string;
  departure_token?: string;
  extensions?: string[];
}

interface SerpApiResponse {
  best_flights?: SerpApiResult[];
  other_flights?: SerpApiResult[];
  search_metadata?: { id?: string };
  search_parameters?: Record<string, unknown>;
  error?: string;
}

function mapCabinClass(cabin: FlightSearchParams["cabinClass"]): number {
  switch (cabin) {
    case "economy": return 1;
    case "premium_economy": return 2;
    case "business": return 3;
    case "first": return 4;
    default: return 1;
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function parseDate(dateStr: string | undefined, searchDate: string): string {
  // SerpApi returns times like "2026-03-23 10:30" or just "10:30 AM"
  if (!dateStr) return searchDate;
  // If it looks like ISO-ish already
  if (dateStr.includes("-")) return dateStr.replace(" ", "T");
  // Otherwise just attach the search date
  return `${searchDate}T${dateStr}`;
}

export const serpapiProvider: FlightSearchProvider = {
  name: "serpapi",

  isAvailable(): boolean {
    return !!process.env.SERPAPI_API_KEY;
  },

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("SERPAPI_API_KEY is not set");

    // Build Google Flights search URL
    const searchParams = new URLSearchParams({
      engine: "google_flights",
      api_key: apiKey,
      departure_id: params.origin,
      arrival_id: params.destination,
      outbound_date: params.departureDate,
      type: params.returnDate ? "1" : "2", // 1=round trip, 2=one way
      travel_class: mapCabinClass(params.cabinClass).toString(),
      adults: params.passengers.toString(),
      currency: "USD",
      hl: "en",
    });

    if (params.returnDate) {
      searchParams.set("return_date", params.returnDate);
    }

    if (params.maxStops !== undefined) {
      searchParams.set("stops", params.maxStops.toString());
    }

    if (params.pointOfSale) {
      searchParams.set("gl", params.pointOfSale.toLowerCase());
    }

    const url = `${SERPAPI_BASE}?${searchParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}`);
    }

    const data: SerpApiResponse = await response.json();

    if (data.error) {
      throw new Error(`SerpApi: ${data.error}`);
    }

    // Combine best_flights and other_flights
    const allResults = [
      ...(data.best_flights || []),
      ...(data.other_flights || []),
    ];

    return allResults.slice(0, 20).map((result, index): FlightOffer => {
      const segments: FlightSegment[] = (result.flights || []).map(
        (flight): FlightSegment => ({
          airline: flight.flight_number?.substring(0, 2) || "",
          airlineName: flight.airline || "Unknown",
          flightNumber: flight.flight_number || "",
          aircraft: flight.airplane || undefined,
          origin: flight.departure_airport?.id || params.origin,
          originName: flight.departure_airport?.name || params.origin,
          destination: flight.arrival_airport?.id || params.destination,
          destinationName: flight.arrival_airport?.name || params.destination,
          departureTime: parseDate(
            flight.departure_airport?.time,
            params.departureDate
          ),
          arrivalTime: parseDate(
            flight.arrival_airport?.time,
            params.departureDate
          ),
          duration: flight.duration
            ? `PT${Math.floor(flight.duration / 60)}H${flight.duration % 60}M`
            : "",
          cabinClass: flight.travel_class || params.cabinClass,
          fareBrand: undefined,
        })
      );

      const stops = segments.length - 1;
      const totalDuration = result.total_duration || 0;
      const uniqueAirlines = [
        ...new Set(segments.map((s) => s.airlineName)),
      ];

      // Check extensions for refundability hints
      const extensions = result.extensions || [];
      const changeable = extensions.some(
        (e) => e.toLowerCase().includes("change") && !e.toLowerCase().includes("no change")
      );

      return {
        id: `serpapi_${data.search_metadata?.id || "unknown"}_${index}`,
        provider: "serpapi",
        providerOfferId: result.departure_token || `serpapi_${index}`,
        totalPrice: result.price || 0,
        currency: "USD",
        pricePerPassenger: (result.price || 0) / params.passengers,
        outbound: segments,
        inbound: undefined, // SerpApi returns outbound only in initial search
        totalDuration: formatDuration(totalDuration),
        stops,
        airlines: uniqueAirlines,
        refundable: false,
        changeable,
        baggageIncluded: undefined,
        bookable: false, // SerpApi is search only — redirect to book
        bookingUrl: `https://www.google.com/travel/flights?q=flights+${params.origin}+to+${params.destination}`,
        pointOfSale: params.pointOfSale,
      };
    });
  },
};
