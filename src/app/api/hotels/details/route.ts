import { auth } from "@/lib/auth";
import { fetchHotelDetails } from "@/lib/hotels/details";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { cacheGet, cacheSet, hotelDetailCacheKey, CACHE_TTL } from "@/lib/cache";
import type { HotelDetail } from "@/lib/hotels/types";

export const maxDuration = 15;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rl = await rateLimit(
    session.user.id,
    "hotelDetails",
    RATE_LIMITS.hotelDetails
  );
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many detail requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const propertyToken = searchParams.get("token");
  const location = searchParams.get("location");
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");
  const adults = searchParams.get("adults");
  const currency = searchParams.get("currency");

  if (!propertyToken || !checkIn || !checkOut || !location) {
    return Response.json(
      { error: "Missing required params: token, location, check_in, check_out" },
      { status: 400 }
    );
  }

  try {
    // Check cache first (6-hour TTL)
    const cacheKey = hotelDetailCacheKey(propertyToken, checkIn, checkOut);
    const cached = await cacheGet<HotelDetail>(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    const detail = await fetchHotelDetails({
      propertyToken,
      location,
      checkIn,
      checkOut,
      adults: adults ? parseInt(adults) : undefined,
      currency: currency || undefined,
    });

    // Cache the result
    await cacheSet(cacheKey, detail, CACHE_TTL.hotelDetail);

    return Response.json(detail);
  } catch (err) {
    console.error("[hotel-details] Error:", err);
    return Response.json(
      { error: "Failed to fetch hotel details" },
      { status: 500 }
    );
  }
}
