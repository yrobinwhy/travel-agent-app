"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  trips,
  bookings,
  itinerarySegments,
} from "@/lib/db/schema/trips";
import { eq, desc, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
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

export async function getTripById(tripId: string) {
  const user = await getUser();
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));
  return trip || null;
}

export async function getTripWithSegments(tripId: string) {
  const user = await getUser();
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id!)));

  if (!trip) return null;

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

  if (!title?.trim()) throw new Error("Trip title is required");

  await db
    .insert(trips)
    .values({
      userId: user.id!,
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
  const [trip] = await db
    .insert(trips)
    .values({
      userId: data.userId,
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
