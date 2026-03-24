import { auth } from "@/lib/auth";
import { broadcastTripEvent, type TripEvent } from "@/lib/pusher/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tripId, event } = await request.json();

  if (!tripId || !event?.type) {
    return new Response("Missing tripId or event", { status: 400 });
  }

  const fullEvent: TripEvent = {
    ...event,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
  };

  await broadcastTripEvent(tripId, fullEvent);

  return Response.json({ ok: true });
}
