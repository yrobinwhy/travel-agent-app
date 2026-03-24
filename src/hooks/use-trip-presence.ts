"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/pusher/client";
import type { Channel, Members, PresenceChannel } from "pusher-js";

export interface TripMember {
  id: string;
  name: string;
  email: string;
  image: string;
  isEditing: boolean;
}

export interface TripEvent {
  type: string;
  userId: string;
  userName: string;
  action?: string;
  detail?: string;
  segmentType?: string;
  title?: string;
  bookingType?: string;
  vendor?: string;
  timestamp: string;
}

export function useTripPresence(tripId: string | null, currentUserId: string | null) {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<PresenceChannel | null>(null);

  useEffect(() => {
    if (!tripId || !currentUserId) return;

    const client = getPusherClient();
    const channel = client.subscribe(`presence-trip-${tripId}`) as PresenceChannel;
    channelRef.current = channel;

    // Presence events
    channel.bind("pusher:subscription_succeeded", (membersData: Members) => {
      setIsConnected(true);
      const memberList: TripMember[] = [];
      membersData.each((member: { id: string; info: { name: string; email: string; image: string } }) => {
        memberList.push({
          id: member.id,
          name: member.info.name,
          email: member.info.email,
          image: member.info.image,
          isEditing: false,
        });
      });
      setMembers(memberList);
    });

    channel.bind("pusher:member_added", (member: { id: string; info: { name: string; email: string; image: string } }) => {
      setMembers((prev) => {
        if (prev.find((m) => m.id === member.id)) return prev;
        return [...prev, {
          id: member.id,
          name: member.info.name,
          email: member.info.email,
          image: member.info.image,
          isEditing: false,
        }];
      });
    });

    channel.bind("pusher:member_removed", (member: { id: string }) => {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    });

    // Trip events
    channel.bind("trip-event", (event: TripEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 20)); // Keep last 20

      // Update editing status
      if (event.type === "editing-started") {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === event.userId ? { ...m, isEditing: true } : m
          )
        );
      } else if (event.type === "editing-stopped") {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === event.userId ? { ...m, isEditing: false } : m
          )
        );
      }
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(`presence-trip-${tripId}`);
      channelRef.current = null;
      setIsConnected(false);
      setMembers([]);
    };
  }, [tripId, currentUserId]);

  const broadcastEditing = useCallback(
    async (isEditing: boolean) => {
      if (!tripId) return;
      await fetch("/api/pusher/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          event: {
            type: isEditing ? "editing-started" : "editing-stopped",
          },
        }),
      });
    },
    [tripId]
  );

  return {
    members,
    events,
    isConnected,
    broadcastEditing,
    otherMembers: members.filter((m) => m.id !== currentUserId),
    editingMembers: members.filter((m) => m.isEditing && m.id !== currentUserId),
  };
}
