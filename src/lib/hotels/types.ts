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
  hotelClass?: number; // 2-5 star minimum
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
  // Reviews
  locationRating?: number; // Location score (0-5)
  reviewBreakdown?: Array<{ name: string; positive: number; negative: number; total: number }>;
  tripAdvisorRating?: number; // TripAdvisor rating (0-5)
  tripAdvisorReviews?: number;
  tripAdvisorRank?: string; // e.g. "#12 of 456 hotels in Lisbon"
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

// --- Hotel Deep-Dive Detail Types ---

export interface HotelDetailImage {
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface HotelDetailReview {
  rating?: number;
  text: string;
  date?: string;
  source?: string;
  author?: string;
}

export interface HotelDetailNearbyPlace {
  name: string;
  type: string; // "restaurant", "attraction", "transit", etc.
  distance?: string;
  rating?: number;
}

export interface HotelDetailPriceSource {
  source: string; // "Booking.com", "Hotels.com", etc.
  price: number;
  currency: string;
  url?: string;
  roomType?: string;
  logo?: string;
}

export interface HotelDetailReviewBreakdown {
  name: string;
  description?: string;
  positive: number;
  negative: number;
  total: number;
}

export interface HotelDetail {
  // Full image gallery (more than the 5 from search)
  images: HotelDetailImage[];
  // Detailed review breakdown by category
  reviewBreakdown: HotelDetailReviewBreakdown[];
  // Individual review excerpts
  reviews: HotelDetailReview[];
  // Nearby places with distances
  nearbyPlaces: HotelDetailNearbyPlace[];
  // Prices from multiple booking sites
  prices: HotelDetailPriceSource[];
  // Full amenities (not truncated)
  amenities: string[];
  // Location
  locationRating?: number;
  latitude?: number;
  longitude?: number;
  // Hotel description text
  description?: string;
  // Check-in/out times
  checkInTime?: string;
  checkOutTime?: string;
}

export interface HotelDetailParams {
  propertyToken: string;
  location: string; // Required by SerpApi — the q parameter
  checkIn: string;
  checkOut: string;
  adults?: number;
  currency?: string;
}
