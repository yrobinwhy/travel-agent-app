import type {
  HotelSearchProvider,
  HotelSearchParams,
  HotelOffer,
} from "../types";

export const serpapiHotelProvider: HotelSearchProvider = {
  name: "serpapi",

  isAvailable(): boolean {
    return !!process.env.SERPAPI_API_KEY;
  },

  async search(params: HotelSearchParams): Promise<HotelOffer[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("SERPAPI_API_KEY not set");

    const nights = Math.max(
      1,
      Math.round(
        (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) /
          86400000
      )
    );

    // Step 1: Search for hotels
    const searchParams = new URLSearchParams({
      engine: "google_hotels",
      q: params.location,
      check_in_date: params.checkIn,
      check_out_date: params.checkOut,
      adults: String(params.guests),
      currency: params.currency || "USD",
      gl: "us",
      hl: "en",
      api_key: apiKey,
    });

    if (params.sortBy === "price") {
      searchParams.set("sort_by", "3"); // lowest price
    } else if (params.sortBy === "rating") {
      searchParams.set("sort_by", "5"); // highest rating
    }

    if (params.minPrice) searchParams.set("min_price", String(params.minPrice));
    if (params.maxPrice) searchParams.set("max_price", String(params.maxPrice));
    if (params.hotelClass) searchParams.set("hotel_class", String(params.hotelClass));

    const response = await fetch(
      `https://serpapi.com/search.json?${searchParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`SerpApi hotel search failed: ${response.status}`);
    }

    const data = await response.json();
    const properties = data.properties || [];

    return properties.slice(0, 20).map((prop: Record<string, unknown>, idx: number) => {
      const gps = prop.gps_coordinates as Record<string, number> | undefined;
      const ratePerNight = prop.rate_per_night as Record<string, unknown> | undefined;
      const totalRate = prop.total_rate as Record<string, unknown> | undefined;
      const images = (prop.images as Array<Record<string, string>>) || [];
      const amenities = (prop.amenities as string[]) || [];
      const nearbyPlaces = prop.nearby_places as Array<Record<string, unknown>> | undefined;

      // Parse price — SerpApi returns it as "$XXX" string
      const priceStr = (ratePerNight?.lowest as string) || (ratePerNight?.extracted_lowest as string) || "";
      const pricePerNight = parseFloat(String(ratePerNight?.extracted_lowest || priceStr.replace(/[^0-9.]/g, ""))) || 0;
      const totalPrice = parseFloat(String(totalRate?.extracted_lowest || "0")) || pricePerNight * nights;

      const originalPriceStr = (ratePerNight?.before_taxes_fees as string) || "";
      const originalPrice = parseFloat(originalPriceStr.replace(/[^0-9.]/g, "")) || undefined;

      return {
        id: `serpapi-hotel-${idx}-${(prop.name as string || "").slice(0, 20).replace(/\s/g, "-")}`,
        provider: "serpapi" as const,
        providerOfferId: (prop.property_token as string) || `serpapi-${idx}`,
        name: (prop.name as string) || "Unknown Hotel",
        brand: (prop.hotel_class as string) || undefined,
        starRating: (prop.extracted_hotel_class as number) || undefined,
        guestRating: (prop.overall_rating as number) || undefined,
        guestRatingText: getRatingText(prop.overall_rating as number),
        reviewCount: (prop.reviews as number) || undefined,
        address: (prop.description as string) || undefined,
        neighborhood: nearbyPlaces?.[0]?.name as string || undefined,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        distanceFromCenter: undefined,
        totalPrice,
        pricePerNight,
        currency: params.currency || "USD",
        originalPrice,
        dealLabel: (prop.deal as string) || (prop.deal_description as string) || undefined,
        roomType: (prop.type as string) || undefined,
        amenities,
        images: images.slice(0, 5).map((img) => img.thumbnail || img.original_image || ""),
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights,
        freeCancellation: amenities.some((a: string) =>
          a.toLowerCase().includes("free cancellation")
        ),
        payAtProperty: amenities.some((a: string) =>
          a.toLowerCase().includes("pay at property")
        ),
        valueScore: undefined, // Scored later
        valueNotes: [],
        bookable: false, // SerpApi is search-only
        bookingUrl: (prop.link as string) || undefined,
      };
    });
  },
};

function getRatingText(rating: number | undefined): string | undefined {
  if (!rating) return undefined;
  if (rating >= 4.5) return "Exceptional";
  if (rating >= 4.0) return "Excellent";
  if (rating >= 3.5) return "Very Good";
  if (rating >= 3.0) return "Good";
  if (rating >= 2.5) return "Fair";
  return "Below Average";
}
