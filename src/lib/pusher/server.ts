import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherInstance;
}

// ============================================
// Trip Events
// ============================================

export type TripEvent =
  | { type: "trip-updated"; userId: string; userName: string; action: string; detail?: string }
  | { type: "editing-started"; userId: string; userName: string }
  | { type: "editing-stopped"; userId: string; userName: string }
  | { type: "segment-added"; userId: string; userName: string; segmentType: string; title: string }
  | { type: "booking-added"; userId: string; userName: string; bookingType: string; vendor: string };

export async function broadcastTripEvent(tripId: string, event: TripEvent) {
  try {
    const pusher = getPusher();
    await pusher.trigger(`presence-trip-${tripId}`, "trip-event", {
      ...event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical — don't break the main flow if Pusher fails
    if (process.env.NODE_ENV === "development") {
      console.error("[Pusher] broadcast failed:", error);
    }
  }
}

// ============================================
// Notification Events
// ============================================

export async function sendUserNotification(userId: string, notification: {
  title: string;
  message: string;
  link?: string;
  type?: "info" | "success" | "warning";
}) {
  try {
    const pusher = getPusher();
    await pusher.trigger(`private-user-${userId}`, "notification", {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Pusher] notification failed:", error);
    }
  }
}
