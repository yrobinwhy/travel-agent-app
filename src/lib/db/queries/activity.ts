"use server";

import { db } from "@/lib/db";
import { tripActivityLog, tripLastViewed, trips } from "@/lib/db/schema";
import { eq, and, desc, gt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

/** Log a trip activity */
export async function logTripActivity(
  tripId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(tripActivityLog).values({
    tripId,
    userId,
    action,
    description,
    metadata: metadata || null,
  });

  // Also update the trip's updatedAt so the "new update" dot works
  await db.update(trips).set({ updatedAt: new Date() }).where(eq(trips.id, tripId));
}

/** Get activity log for a trip */
export async function getTripActivity(tripId: string, limit = 20) {
  return db
    .select()
    .from(tripActivityLog)
    .where(eq(tripActivityLog.tripId, tripId))
    .orderBy(desc(tripActivityLog.createdAt))
    .limit(limit);
}

/** Mark a trip as viewed by the current user */
export async function markTripViewed(tripId: string) {
  const user = await getUser();

  const [existing] = await db
    .select()
    .from(tripLastViewed)
    .where(and(eq(tripLastViewed.tripId, tripId), eq(tripLastViewed.userId, user.id!)));

  if (existing) {
    await db
      .update(tripLastViewed)
      .set({ viewedAt: new Date() })
      .where(eq(tripLastViewed.id, existing.id));
  } else {
    await db.insert(tripLastViewed).values({
      tripId,
      userId: user.id!,
    });
  }
}

/** Mark all accessible trips as viewed (called when user visits /trips list) */
export async function markAllTripsViewed() {
  const user = await getUser();
  const { orgMemberships } = await import("@/lib/db/schema");
  const { inArray, ne } = await import("drizzle-orm");

  const userTrips = await db.select({ id: trips.id }).from(trips).where(eq(trips.userId, user.id!));
  const memberships = await db.select({ orgId: orgMemberships.orgId }).from(orgMemberships).where(eq(orgMemberships.userId, user.id!));
  const orgIds = memberships.map((m) => m.orgId);

  let sharedTrips: { id: string }[] = [];
  if (orgIds.length > 0) {
    sharedTrips = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(inArray(trips.orgId, orgIds), ne(trips.userId, user.id!)));
  }

  const allTripIds = [...userTrips, ...sharedTrips].map((t) => t.id);
  if (allTripIds.length === 0) return;

  // Upsert all trips as viewed
  for (const tripId of allTripIds) {
    const [existing] = await db
      .select()
      .from(tripLastViewed)
      .where(and(eq(tripLastViewed.tripId, tripId), eq(tripLastViewed.userId, user.id!)));

    if (existing) {
      await db.update(tripLastViewed).set({ viewedAt: new Date() }).where(eq(tripLastViewed.id, existing.id));
    } else {
      await db.insert(tripLastViewed).values({ tripId, userId: user.id! });
    }
  }

  revalidatePath("/trips");
}

/** Check if any trips have activity BY OTHER USERS since the current user last viewed them */
export async function hasUnviewedTripUpdates(): Promise<boolean> {
  const user = await getUser();

  // Get all trip IDs user has access to (own + shared via org)
  const { orgMemberships } = await import("@/lib/db/schema");
  const { inArray, ne } = await import("drizzle-orm");

  const userTrips = await db.select({ id: trips.id }).from(trips).where(eq(trips.userId, user.id!));
  const memberships = await db.select({ orgId: orgMemberships.orgId }).from(orgMemberships).where(eq(orgMemberships.userId, user.id!));
  const orgIds = memberships.map((m) => m.orgId);

  let sharedTrips: { id: string }[] = [];
  if (orgIds.length > 0) {
    sharedTrips = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(inArray(trips.orgId, orgIds), ne(trips.userId, user.id!)));
  }

  const allTripIds = [...userTrips, ...sharedTrips].map((t) => t.id);
  if (allTripIds.length === 0) return false;

  // Get last viewed times for these trips
  const viewedRecords = await db
    .select()
    .from(tripLastViewed)
    .where(and(eq(tripLastViewed.userId, user.id!)));
  const viewedMap = new Map(viewedRecords.map((v) => [v.tripId, v.viewedAt]));

  // Check activity log for updates by OTHER users since last viewed
  for (const tripId of allTripIds) {
    const lastViewed = viewedMap.get(tripId);

    // Look for activity entries by OTHER users after last viewed
    const recentActivity = await db
      .select({ id: tripActivityLog.id })
      .from(tripActivityLog)
      .where(
        and(
          eq(tripActivityLog.tripId, tripId),
          ne(tripActivityLog.userId, user.id!),
          lastViewed ? gt(tripActivityLog.createdAt, lastViewed) : undefined
        )
      )
      .limit(1);

    if (recentActivity.length > 0) {
      return true;
    }
  }

  return false;
}
