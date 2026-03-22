import { auth } from "@/lib/auth";
import { searchFlights } from "@/lib/flights";
import type { FlightSearchParams } from "@/lib/flights";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = (await request.json()) as FlightSearchParams;

    // Validate required fields
    if (!body.origin || !body.destination || !body.departureDate) {
      return Response.json(
        {
          error:
            "Missing required fields: origin, destination, departureDate",
        },
        { status: 400 }
      );
    }

    // Default values
    const params: FlightSearchParams = {
      origin: body.origin.toUpperCase(),
      destination: body.destination.toUpperCase(),
      departureDate: body.departureDate,
      returnDate: body.returnDate,
      passengers: body.passengers || 1,
      cabinClass: body.cabinClass || "economy",
      maxStops: body.maxStops,
      preferredAirlines: body.preferredAirlines,
      flexibleDates: body.flexibleDates,
      pointOfSale: body.pointOfSale,
      sortBy: body.sortBy || "value",
    };

    const result = await searchFlights(params);

    // Strip rawData from response to save bandwidth
    const sanitizedOffers = result.offers.map(({ rawData, ...offer }) => offer);

    return Response.json({
      ...result,
      offers: sanitizedOffers,
    });
  } catch (error) {
    console.error("Flight search error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Flight search failed",
      },
      { status: 500 }
    );
  }
}
