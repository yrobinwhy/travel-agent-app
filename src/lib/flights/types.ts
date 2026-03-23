// Unified flight search types across all providers

export interface FlightSearchParams {
  origin: string; // IATA code e.g. "JFK"
  destination: string; // IATA code e.g. "NRT"
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD for round trips
  passengers: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  maxStops?: number; // 0 = nonstop, 1, 2, null = any
  preferredAirlines?: string[]; // IATA airline codes
  flexibleDates?: boolean; // Search nearby dates
  pointOfSale?: string; // Country code for POS arbitrage e.g. "IN", "US", "GB"
  sortBy?: "price" | "duration" | "departure" | "arrival" | "value";
}

export interface FlightSegment {
  airline: string; // IATA code
  airlineName: string;
  flightNumber: string;
  aircraft?: string;
  origin: string; // IATA
  originName: string;
  destination: string; // IATA
  destinationName: string;
  departureTime: string; // ISO 8601
  arrivalTime: string; // ISO 8601
  duration: string; // ISO 8601 duration e.g. "PT10H30M"
  cabinClass: string;
  fareBrand?: string; // e.g. "World Traveller Plus"
}

export interface FlightOffer {
  id: string;
  provider: "duffel" | "serpapi" | "sabre" | "kiwi";
  providerOfferId: string; // Original ID from provider for booking
  // Pricing
  totalPrice: number;
  currency: string;
  pricePerPassenger: number;
  // Itinerary
  outbound: FlightSegment[];
  inbound?: FlightSegment[]; // For round trips
  // Summary
  totalDuration: string; // e.g. "10h 30m"
  stops: number;
  airlines: string[]; // Unique airline names
  // Metadata
  refundable?: boolean;
  changeable?: boolean;
  changeFeeSummary?: string;
  baggageIncluded?: string;
  // Value scoring
  valueScore?: number; // 0-100 computed by our engine
  valueNotes?: string[]; // e.g. ["Great business class value at $X/hr"]
  // POS arbitrage
  pointOfSale?: string;
  alternativePrices?: { country: string; price: number; currency: string }[];
  // Booking
  bookable: boolean; // Can we book through our system?
  bookingUrl?: string; // Fallback URL for manual booking
  // Raw data for debugging
  rawData?: unknown;
}

export interface FlightSearchResult {
  params: FlightSearchParams;
  offers: FlightOffer[];
  searchedAt: string;
  providers: string[];
  errors?: { provider: string; error: string }[];
  // Metadata
  cheapestPrice?: number;
  fastestDuration?: string;
  bestValue?: string; // offer ID
}

export interface FlightSearchProvider {
  name: string;
  search(params: FlightSearchParams): Promise<FlightOffer[]>;
  isAvailable(): boolean;
}
