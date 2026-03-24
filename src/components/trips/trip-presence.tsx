"use client";

import { useTripPresence, type TripEvent } from "@/hooks/use-trip-presence";
import { useEffect, useState } from "react";
import { Circle, Pencil, Bell } from "lucide-react";

export function TripPresence({
  tripId,
  currentUserId,
}: {
  tripId: string;
  currentUserId: string;
}) {
  const { otherMembers, editingMembers, events, isConnected } =
    useTripPresence(tripId, currentUserId);
  const [latestEvent, setLatestEvent] = useState<TripEvent | null>(null);
  const [showEvent, setShowEvent] = useState(false);

  // Show toast-like notification for new events
  useEffect(() => {
    if (events.length === 0) return;
    const event = events[0];
    if (event.userId === currentUserId) return; // Don't notify yourself

    setLatestEvent(event);
    setShowEvent(true);
    const timer = setTimeout(() => setShowEvent(false), 5000);
    return () => clearTimeout(timer);
  }, [events, currentUserId]);

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Active members avatars */}
      {otherMembers.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {otherMembers.map((member) => (
              <div
                key={member.id}
                className="relative"
                title={`${member.name}${member.isEditing ? " (editing)" : " (viewing)"}`}
              >
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-7 w-7 rounded-full border-2 border-background"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full border-2 border-background bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                    {member.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                {/* Status dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                    member.isEditing
                      ? "bg-amber-500 animate-pulse"
                      : "bg-emerald-500"
                  }`}
                />
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {otherMembers.length === 1
              ? otherMembers[0].name?.split(" ")[0]
              : `${otherMembers.length} people`}
            {" "}viewing
          </span>
        </div>
      )}

      {/* Editing warning */}
      {editingMembers.length > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Pencil className="h-3 w-3 text-amber-500 animate-pulse" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {editingMembers.map((m) => m.name?.split(" ")[0]).join(", ")} editing
          </span>
        </div>
      )}

      {/* Live event notification */}
      {showEvent && latestEvent && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 animate-fade-in">
          <Bell className="h-3 w-3 text-blue-500" />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {formatEvent(latestEvent)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatEvent(event: TripEvent): string {
  const name = event.userName?.split(" ")[0] || "Someone";
  switch (event.type) {
    case "segment-added":
      return `${name} added ${event.segmentType}: ${event.title}`;
    case "booking-added":
      return `${name} booked ${event.vendor}`;
    case "editing-started":
      return `${name} started editing`;
    case "editing-stopped":
      return `${name} finished editing`;
    case "trip-updated":
      return `${name} ${event.action || "updated the trip"}`;
    default:
      return `${name} made a change`;
  }
}
