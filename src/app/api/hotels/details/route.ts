import { auth } from "@/lib/auth";
import { fetchHotelDetails } from "@/lib/hotels/details";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");
  const adults = searchParams.get("adults");
  const currency = searchParams.get("currency");

  if (!propertyToken || !checkIn || !checkOut) {
    return Response.json(
      { error: "Missing required params: token, check_in, check_out" },
      { status: 400 }
    );
  }

  try {
    const detail = await fetchHotelDetails({
      propertyToken,
      checkIn,
      checkOut,
      adults: adults ? parseInt(adults) : undefined,
      currency: currency || undefined,
    });

    return Response.json(detail);
  } catch (err) {
    console.error("[hotel-details] Error:", err);
    return Response.json(
      { error: "Failed to fetch hotel details" },
      { status: 500 }
    );
  }
}
