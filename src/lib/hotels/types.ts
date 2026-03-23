// Unified hotel search types

export interface HotelSearchParams {
  location: string; // City name or coordinates
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  rooms: number;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number; // 1-5
  amenities?: string[]; // e.g. ["wifi", "pool", "gym"]
  sortBy?: "price" | "rating" | "distance" | "value";
}

export interface HotelOffer {
  id: string;
  provider: "serpapi" | "duffel" | "booking";
  providerOfferId: string;
  // Property
  name: string;
  brand?: string;
  starRating?: number; // 1-5
  guestRating?: number; // 0-10 or 0-5 depending on source
  guestRatingText?: string; // "Excellent", "Very Good", etc.
  reviewCount?: number;
  // Location
  address?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  distanceFromCenter?: string;
  // Pricing
  totalPrice: number;
  pricePerNight: number;
  currency: string;
  originalPrice?: number; // Before discount
  dealLabel?: string; // "20% off", "Great Deal"
  // Details
  roomType?: string;
  amenities: string[];
  images: string[];
  checkIn: string;
  checkOut: string;
  nights: number;
  // Cancellation
  freeCancellation?: boolean;
  cancellationDeadline?: string;
  payAtProperty?: boolean;
  // Value
  valueScore?: number; // 0-100
  valueNotes?: string[];
  // Booking
  bookable: boolean;
  bookingUrl?: string;
}

export interface HotelSearchResult {
  params: HotelSearchParams;
  offers: HotelOffer[];
  searchedAt: string;
  providers: string[];
  errors?: { provider: string; error: string }[];
  cheapestPrice?: number;
  bestRated?: string; // offer ID
}

export interface HotelSearchProvider {
  name: string;
  search(params: HotelSearchParams): Promise<HotelOffer[]>;
  isAvailable(): boolean;
}
