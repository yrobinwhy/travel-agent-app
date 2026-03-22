import { Duffel } from "@duffel/api";
import type {
  FlightSearchProvider,
  FlightSearchParams,
  FlightOffer,
  FlightSegment,
} from "../types";

let duffelClient: Duffel | null = null;

function getClient(): Duffel {
  if (!duffelClient) {
    const apiKey = process.env.DUFFEL_API_KEY;
    if (!apiKey) {
      throw new Error("DUFFEL_API_KEY is not set");
    }
    duffelClient = new Duffel({ token: apiKey });
  }
  return duffelClient;
}

function mapCabinClass(
  cabin: FlightSearchParams["cabinClass"]
): "economy" | "premium_economy" | "business" | "first" {
  return cabin;
}

function parseDuration(iso: string): string {
  // Convert ISO 8601 duration "PT10H30M" to "10h 30m"
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const hours = match[1] ? `${match[1]}h` : "";
  const minutes = match[2] ? ` ${match[2]}m` : "";
  return `${hours}${minutes}`.trim();
}

function parseDurationMinutes(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] || "0") * 60) + parseInt(match[2] || "0");
}

export const duffelProvider: FlightSearchProvider = {
  name: "duffel",

  isAvailable(): boolean {
    return !!process.env.DUFFEL_API_KEY;
  },

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const client = getClient();

    // Build slices (outbound + optional return)
    const slices: Array<{
      origin: string;
      destination: string;
      departure_date: string;
      departure_time?: { from: string; to: string };
    }> = [
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departureDate,
      },
    ];

    if (params.returnDate) {
      slices.push({
        origin: params.destination,
        destination: params.origin,
        departure_date: params.returnDate,
      });
    }

    // Create offer request
    const offerRequest = await client.offerRequests.create({
      slices: slices as Parameters<typeof client.offerRequests.create>[0]["slices"],
      passengers: Array.from({ length: params.passengers }, () => ({
        type: "adult" as const,
      })),
      cabin_class: mapCabinClass(params.cabinClass),
      max_connections: (params.maxStops !== undefined ? params.maxStops : undefined) as 0 | 1 | 2 | undefined,
      return_offers: true,
    });

    const offers = offerRequest.data.offers || [];

    // Map to unified format
    return offers.slice(0, 20).map((offer): FlightOffer => {
      const outboundSlice = offer.slices[0];
      const inboundSlice = offer.slices.length > 1 ? offer.slices[1] : undefined;

      const mapSegments = (slice: typeof outboundSlice): FlightSegment[] =>
        slice.segments.map((seg) => ({
          airline: seg.operating_carrier?.iata_code || seg.marketing_carrier?.iata_code || "",
          airlineName: seg.operating_carrier?.name || seg.marketing_carrier?.name || "Unknown",
          flightNumber: `${seg.marketing_carrier?.iata_code || ""}${seg.marketing_carrier_flight_number || ""}`,
          aircraft: seg.aircraft?.name || undefined,
          origin: seg.origin.iata_code || "",
          originName: seg.origin.name || "",
          destination: seg.destination.iata_code || "",
          destinationName: seg.destination.name || "",
          departureTime: seg.departing_at,
          arrivalTime: seg.arriving_at,
          duration: seg.duration || "",
          cabinClass: (seg.passengers?.[0] as unknown as Record<string, unknown>)?.cabin_class_marketing_name as string || params.cabinClass,
          fareBrand: (seg.passengers?.[0] as unknown as Record<string, unknown>)?.fare_brand_name as string || undefined,
        }));

      const totalDurationMins = outboundSlice.segments.reduce(
        (acc, seg) => acc + parseDurationMinutes(seg.duration || "PT0M"),
        0
      );

      const uniqueAirlines = [
        ...new Set(
          outboundSlice.segments.map(
            (s) => s.operating_carrier?.name || s.marketing_carrier?.name || "Unknown"
          )
        ),
      ];

      // Check conditions
      const conditions = offer.conditions;
      const refundable = conditions?.refund_before_departure?.allowed ?? false;
      const changeable = conditions?.change_before_departure?.allowed ?? false;
      const changeFee = conditions?.change_before_departure?.penalty_amount
        ? `${conditions.change_before_departure.penalty_currency} ${conditions.change_before_departure.penalty_amount}`
        : undefined;

      return {
        id: `duffel_${offer.id}`,
        provider: "duffel",
        providerOfferId: offer.id,
        totalPrice: parseFloat(offer.total_amount),
        currency: offer.total_currency,
        pricePerPassenger: parseFloat(offer.total_amount) / params.passengers,
        outbound: mapSegments(outboundSlice),
        inbound: inboundSlice ? mapSegments(inboundSlice) : undefined,
        totalDuration: `${Math.floor(totalDurationMins / 60)}h ${totalDurationMins % 60}m`,
        stops: outboundSlice.segments.length - 1,
        airlines: uniqueAirlines,
        refundable,
        changeable,
        changeFeeSummary: changeFee,
        baggageIncluded: undefined, // TODO: parse baggage from segments
        bookable: true,
        rawData: offer,
      };
    });
  },
};
