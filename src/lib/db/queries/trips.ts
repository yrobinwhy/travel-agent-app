"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  trips,
  bookings,
  itinerarySegments,
  tripShares,
} from "@/lib/db/schema/trips";
import { orgMemberships } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/auth";
import { eq, desc, and, or, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

/** Get all orgIds the user belongs to */
async function getUserOrgIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId));
  return memberships.map((m) => m.orgId);
}

/** Check if user can access a trip (owns it OR shares an org) */
async function canAccessTrip(userId: string, trip: { userId: string; orgId: string | null }): Promise<boolean> {
  if (trip.userId === userId) return true;
  if (!trip.orgId) return false;
  const orgIds = await getUserOrgIds(userId);
  return orgIds.includes(trip.orgId);
}

/** Check if user can EDIT a trip (owns it OR has 'collaborate' permission) */
export async function canEditTrip(tripId: string): Promise<boolean> {
  const user = await getUser();
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!trip) return false;
  if (trip.userId === user.id!) return true; // Owner always can edit

  // Check for collaborate permission via trip_shares
  const shares = await db
    .select()
    .from(tripShares)
    .where(
      and(
        eq(tripShares.tripId, tripId),
        eq(tripShares.permissions, "collaborate")
      )
    );

  // For now, org members with collaborate shares can edit
  // In future, this could be per-user shares
  return shares.length > 0 && await canAccessTrip(user.id!, trip);
}

/** Get org members for a trip's org (for sharing management) */
export async function getTripOrgMembers(tripId: string) {
  const user = await getUser();
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!trip || trip.userId !== user.id! || !trip.orgId) return [];

  const members = await db
    .select({
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(orgMemberships.userId, users.id))
    .where(
      and(
        eq(orgMemberships.orgId, trip.orgId),
        ne(orgMemberships.userId, user.id!) // Exclude owner
      )
    );

  // Get existing shares for this trip
  const shares = await db
    .select()
    .from(tripShares)
    .where(eq(tripShares.tripId, tripId));

  return members.map((m) => {
    const existingShare = shares.find((s) => s.shareToken === m.userId);
    // If an explicit share exists, use it. Otherwise, default based on org role:
    // owner/admin → collaborate (edit), member/viewer → view
    const defaultPermission = (m.role === "owner" || m.role === "admin") ? "collaborate" : "view";
    return {
      ...m,
      permission: existingShare?.permissions || defaultPermission,
    };
  });
}

/** Update a member's permission on a shared trip */
export async function updateTripSharePermission(formData: FormData) {
  const user = await getUser();
  const tripId = formData.get("tripId") as string;
  const memberId = formData.get("memberId") as string;
  const permission = formData.get("permission") as "view" | "collaborate";

  // Verify ownership or admin role
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!trip) throw new Error("Trip not found");
  const isOwner = trip.userId === user.id;
  if (!isOwner && trip.orgId) {
    const [membership] = await db
      .select()
      .from(orgMemberships)
      .where(and(eq(orgMemberships.orgId, trip.orgId), eq(orgMemberships.userId, user.id!)));
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized — only trip owner or org admin can change permissions");
    }
  } else if (!isOwner) {
    throw new Error("Not authorized");
  }

  // Upsert share record (using memberId as shareToken for simplicity)
  const existing = await db
    .select()
    .from(tripShares)
    .where(and(eq(tripShares.tripId, tripId), eq(tripShares.shareToken, memberId)));

  if (existing.length > 0) {
    await db
      .update(tripShares)
      .set({ permissions: permission })
      .where(and(eq(tripShares.tripId, tripId), eq(tripShares.shareToken, memberId)));
  } else {
    await db.insert(tripShares).values({
      tripId,
      shareToken: memberId,
      permissions: permission,
    });
  }

  // Log permission change
  const { logTripActivity } = await import("./activity");
  await logTripActivity(
    tripId,
    user.id!,
    "permission_changed",
    `${user.name || "User"} set permissions to ${permission === "collaborate" ? "Can edit" : "Can view"}`,
    { memberId, newPermission: permission }
  );

  revalidatePath(`/trips/${tripId}`);
}

// ============================================
// TRIPS
// ============================================

export async function getUserTrips() {
  const user = await getUser();
  return db
    .select()
    .from(trips)
    .where(eq(trips.userId, user.id!))
    .orderBy(desc(trips.updatedAt));
}

/** Get trips shared with user via org (not owned by user) */
export async function getSharedTrips() {
  const user = await getUser();
  const orgIds = await getUserOrgIds(user.id!);

  if (orgIds.length === 0) return [];

  // Get trips belonging to orgs user is in, but not owned by user
  const sharedTrips = await db
    .select({
      id: trips.id,
      userId: trips.userId,
      orgId: trips.orgId,
      title: trips.title,
      destinationCity: trips.destinationCity,
      destinationCountry: trips.destinationCountry,
      startDate: trips.startDate,
      endDate: trips.endDate,
      status: trips.status,
      notes: trips.notes,
      travelers: trips.travelers,
      conversationId: trips.conversationId,
      createdAt: trips.createdAt,
      updatedAt: trips.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(trips)
    .innerJoin(users, eq(trips.userId, users.id))
    .where(
      and(
        inArray(trips.orgId, orgIds),
        ne(trips.userId, user.id!)
      )
    )
    .orderBy(desc(trips.updatedAt));

  return sharedTrips;
}

export async function getTripById(tripId: string) {
  const user = await getUser();
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId));

  if (!trip) return null;

  // Check access: own it or share org
  const hasAccess = await canAccessTrip(user.id!, trip);
  if (!hasAccess) return null;

  return trip;
}

export async function getTripWithSegments(tripId: string) {
  const user = await getUser();
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId));

  if (!trip) return null;

  // Check access: own it or share org
  const hasAccess = await canAccessTrip(user.id!, trip);
  if (!hasAccess) return null;

  const segments = await db
    .select()
    .from(itinerarySegments)
    .where(eq(itinerarySegments.tripId, tripId))
    .orderBy(itinerarySegments.startAt);

  const tripBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.tripId, tripId))
    .orderBy(bookings.checkInAt);

  return { ...trip, segments, bookings: tripBookings };
}

export async function createTrip(formData: FormData) {
  const user = await getUser();

  const title = formData.get("title") as string;
  const destinationCity = formData.get("destinationCity") as string;
  const destinationCountry = formData.get("destinationCountry") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const notes = formData.get("notes") as string;
  const orgId = formData.get("orgId") as string;

  if (!title?.trim()) throw new Error("Trip title is required");

  await db
    .insert(trips)
    .values({
      userId: user.id!,
      orgId: orgId || null,
      title: title.trim(),
      destinationCity: destinationCity || null,
      destinationCountry: destinationCountry || null,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes || null,
      status: "planning",
    });

  revalidatePath("/trips");
}

export async function createTripFromChat(data: {
  title: string;
  destinationCity?: string;
  destinationCountry?: string;
  startDate?: string;
  endDate?: string;
  conversationId?: string;
  userId: string;
}) {
  // Auto-assign the user's first org so trips are shared with team
  const orgIds = await getUserOrgIds(data.userId);
  const orgId = orgIds.length > 0 ? orgIds[0] : null;

  const [trip] = await db
    .insert(trips)
    .values({
      userId: data.userId,
      orgId: orgId,
      title: data.title,
      destinationCity: data.destinationCity || null,
      destinationCountry: data.destinationCountry || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      conversationId: data.conversationId || null,
      status: "planning",
    })
    .returning();

  return trip;
}

export async function updateTrip(formData: FormData) {
  const user = await getUser();
  const tripId = formData.get("tripId") as string;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
  if (!existing) throw new Error("Trip not found");

  const title = formData.get("title") as string;
  const destinationCity = formData.get("destinationCity") as string;
  const destinationCountry = formData.get("destinationCountry") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;
  const orgId = formData.get("orgId") as string | null;

  await db
    .update(trips)
    .set({
      ...(title && { title: title.trim() }),
      ...(destinationCity !== undefined && { destinationCity }),
      ...(destinationCountry !== undefined && { destinationCountry }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(status && { status: status as "planning" | "booked" | "in_progress" | "completed" | "cancelled" }),
      ...(notes !== undefined && { notes }),
      ...(orgId !== undefined && { orgId: orgId || null }),
      updatedAt: new Date(),
    })
    .where(eq(trips.id, tripId));

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteTrip(formData: FormData) {
  const user = await getUser();
  const tripId = formData.get("tripId") as string;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
  if (!existing) throw new Error("Trip not found");

  // Cascade handled by DB, but explicit for clarity
  await db.delete(itinerarySegments).where(eq(itinerarySegments.tripId, tripId));
  await db.delete(bookings).where(eq(bookings.tripId, tripId));
  await db.delete(trips).where(eq(trips.id, tripId));

  revalidatePath("/trips");
}

// ============================================
// ITINERARY SEGMENTS
// ============================================

export async function addSegmentToTrip(data: {
  tripId: string;
  type: "flight" | "hotel_night" | "car_pickup" | "car_return" | "restaurant" | "meeting" | "activity" | "transfer" | "note";
  title?: string;
  description?: string;
  startAt?: Date;
  endAt?: Date;
  timezone?: string;
  locationName?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  carrier?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  cabinClass?: string;
  details?: Record<string, unknown>;
  sortOrder?: number;
}) {
  const [segment] = await db
    .insert(itinerarySegments)
    .values({
      tripId: data.tripId,
      type: data.type,
      title: data.title,
      description: data.description,
      startAt: data.startAt,
      endAt: data.endAt,
      timezone: data.timezone,
      locationName: data.locationName,
      locationAddress: data.locationAddress,
      locationLat: data.locationLat,
      locationLng: data.locationLng,
      carrier: data.carrier,
      flightNumber: data.flightNumber,
      origin: data.origin,
      destination: data.destination,
      cabinClass: data.cabinClass,
      details: data.details || {},
      sortOrder: data.sortOrder || 0,
    })
    .returning();

  revalidatePath(`/trips/${data.tripId}`);
  return segment;
}

export async function deleteSegment(formData: FormData) {
  const user = await getUser();
  const segmentId = formData.get("segmentId") as string;
  const tripId = formData.get("tripId") as string;

  // Verify trip ownership
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
  if (!trip) throw new Error("Trip not found");

  await db.delete(itinerarySegments).where(eq(itinerarySegments.id, segmentId));
  revalidatePath(`/trips/${tripId}`);
}

// ============================================
// BOOKINGS
// ============================================

export async function addBookingToTrip(data: {
  tripId: string;
  userId: string;
  type: "flight" | "hotel" | "car" | "restaurant" | "activity" | "meeting" | "transfer";
  vendorName?: string;
  totalCost?: number;
  currency?: string;
  status?: "draft" | "pending" | "confirmed";
  checkInAt?: Date;
  checkOutAt?: Date;
  details?: Record<string, unknown>;
}) {
  const [booking] = await db
    .insert(bookings)
    .values({
      tripId: data.tripId,
      userId: data.userId,
      type: data.type,
      vendorName: data.vendorName,
      totalCost: data.totalCost,
      currency: data.currency || "USD",
      status: data.status || "draft",
      checkInAt: data.checkInAt,
      checkOutAt: data.checkOutAt,
      details: data.details || {},
    })
    .returning();

  revalidatePath(`/trips/${data.tripId}`);
  return booking;
}
