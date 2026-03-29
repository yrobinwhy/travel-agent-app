import type {
  HotelDetail,
  HotelDetailParams,
  HotelDetailImage,
  HotelDetailReview,
  HotelDetailNearbyPlace,
  HotelDetailPriceSource,
  HotelDetailReviewBreakdown,
} from "./types";

/**
 * Fetch detailed hotel information using SerpApi's google_hotels engine
 * with a property_token (individual hotel detail page).
 * Returns full gallery, reviews, nearby places, price comparison, etc.
 */
export async function fetchHotelDetails(
  params: HotelDetailParams
): Promise<HotelDetail> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY not set");

  const searchParams = new URLSearchParams({
    engine: "google_hotels",
    property_token: params.propertyToken,
    check_in_date: params.checkIn,
    check_out_date: params.checkOut,
    adults: String(params.adults || 2),
    currency: params.currency || "USD",
    gl: "us",
    hl: "en",
    api_key: apiKey,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?${searchParams.toString()}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`SerpApi hotel detail failed: ${response.status}`);
    }

    const data = await response.json();
    return parseHotelDetail(data);
  } finally {
    clearTimeout(timeout);
  }
}

function parseHotelDetail(data: Record<string, unknown>): HotelDetail {
  // --- Images ---
  const rawImages = (data.images as Array<Record<string, string>>) || [];
  const images: HotelDetailImage[] = rawImages.map((img) => ({
    url: img.original_image || img.thumbnail || "",
    thumbnail: img.thumbnail,
    description: img.description || undefined,
  })).filter((img) => img.url);

  // --- Review Breakdown ---
  const rawBreakdown = (data.reviews_breakdown as Array<Record<string, unknown>>) || [];
  const reviewBreakdown: HotelDetailReviewBreakdown[] = rawBreakdown.map((rb) => ({
    name: (rb.name as string) || "",
    description: rb.description as string | undefined,
    positive: (rb.positive as number) || 0,
    negative: (rb.negative as number) || 0,
    total: (rb.total_mentioned as number) || 0,
  }));

  // --- Individual Reviews ---
  const rawReviews = (data.typical_reviews as Array<Record<string, unknown>>) || [];
  const reviews: HotelDetailReview[] = rawReviews.slice(0, 10).map((r) => ({
    rating: r.rating as number | undefined,
    text: (r.description as string) || (r.text as string) || "",
    date: r.date as string | undefined,
    source: r.source as string | undefined,
    author: r.author as string | undefined,
  })).filter((r) => r.text);

  // --- Nearby Places ---
  const rawNearby = (data.nearby_places as Array<Record<string, unknown>>) || [];
  const nearbyPlaces: HotelDetailNearbyPlace[] = rawNearby.map((np) => {
    const transportations = np.transportations as Array<Record<string, string>> | undefined;
    const distance = transportations?.[0]?.duration;
    return {
      name: (np.name as string) || "",
      type: (np.type as string) || "place",
      distance,
      rating: np.rating as number | undefined,
    };
  }).filter((np) => np.name);

  // --- Prices from multiple booking sites ---
  const rawPrices = (data.prices as Array<Record<string, unknown>>) || [];
  const prices: HotelDetailPriceSource[] = rawPrices.map((p) => {
    const ratePerNight = p.rate_per_night as Record<string, unknown> | undefined;
    const price = parseFloat(
      String(ratePerNight?.extracted_lowest || "0").replace(/[^0-9.]/g, "")
    ) || 0;
    return {
      source: (p.source as string) || "Unknown",
      price,
      currency: "USD",
      url: p.link as string | undefined,
      roomType: p.room_type as string | undefined,
      logo: p.logo as string | undefined,
    };
  }).filter((p) => p.price > 0);

  // --- Amenities ---
  const rawAmenities = (data.amenities as string[]) || [];

  // --- Location ---
  const gps = data.gps_coordinates as Record<string, number> | undefined;

  // --- Check-in/out times ---
  const checkInTime = (data.check_in_time as string) || undefined;
  const checkOutTime = (data.check_out_time as string) || undefined;

  return {
    images,
    reviewBreakdown,
    reviews,
    nearbyPlaces,
    prices,
    amenities: rawAmenities,
    locationRating: data.location_rating as number | undefined,
    latitude: gps?.latitude,
    longitude: gps?.longitude,
    description: (data.description as string) || undefined,
    checkInTime,
    checkOutTime,
  };
}
