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

  const { inArray: inArr2 } = await import("drizzle-orm");

  // Batch: get all existing viewed records in one query
  const existingViewed = await db
    .select()
    .from(tripLastViewed)
    .where(and(eq(tripLastViewed.userId, user.id!), inArr2(tripLastViewed.tripId, allTripIds)));

  const existingTripIds = new Set(existingViewed.map((v) => v.tripId));
  const now = new Date();

  // Batch update existing records
  if (existingViewed.length > 0) {
    const existingIds = existingViewed.map((v) => v.id);
    await db
      .update(tripLastViewed)
      .set({ viewedAt: now })
      .where(inArr2(tripLastViewed.id, existingIds));
  }

  // Batch insert new records
  const newTripIds = allTripIds.filter((id) => !existingTripIds.has(id));
  if (newTripIds.length > 0) {
    await db.insert(tripLastViewed).values(
      newTripIds.map((tripId) => ({ tripId, userId: user.id! }))
    );
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

  // Batch check: find any activity by OTHER users on accessible trips since last viewed
  if (allTripIds.length === 0) return false;
  const { inArray: inArr } = await import("drizzle-orm");

  // Single query: get the most recent activity by others for all trips at once
  const recentActivities = await db
    .select({
      tripId: tripActivityLog.tripId,
      createdAt: tripActivityLog.createdAt,
    })
    .from(tripActivityLog)
    .where(
      and(
        inArr(tripActivityLog.tripId, allTripIds),
        ne(tripActivityLog.userId, user.id!)
      )
    )
    .orderBy(desc(tripActivityLog.createdAt))
    .limit(100);

  for (const activity of recentActivities) {
    const lastViewed = viewedMap.get(activity.tripId);
    if (!lastViewed || activity.createdAt > lastViewed) {
      return true;
    }
  }

  return false;
}
