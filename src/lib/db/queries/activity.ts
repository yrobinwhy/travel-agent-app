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

/** Check if any trips have activity since user last viewed them */
export async function hasUnviewedTripUpdates(): Promise<boolean> {
  const user = await getUser();

  // Get all trip IDs user has access to
  const userTrips = await db.select({ id: trips.id, updatedAt: trips.updatedAt }).from(trips).where(eq(trips.userId, user.id!));

  // Get user's org memberships for shared trips
  const { orgMemberships } = await import("@/lib/db/schema");
  const memberships = await db.select({ orgId: orgMemberships.orgId }).from(orgMemberships).where(eq(orgMemberships.userId, user.id!));
  const orgIds = memberships.map((m) => m.orgId);

  let sharedTrips: { id: string; updatedAt: Date }[] = [];
  if (orgIds.length > 0) {
    const { inArray, ne } = await import("drizzle-orm");
    sharedTrips = await db
      .select({ id: trips.id, updatedAt: trips.updatedAt })
      .from(trips)
      .where(and(inArray(trips.orgId, orgIds), ne(trips.userId, user.id!)));
  }

  const allTrips = [...userTrips, ...sharedTrips];
  if (allTrips.length === 0) return false;

  // Get last viewed times
  const viewedRecords = await db
    .select()
    .from(tripLastViewed)
    .where(eq(tripLastViewed.userId, user.id!));
  const viewedMap = new Map(viewedRecords.map((v) => [v.tripId, v.viewedAt]));

  // Check if any trip was updated after last view
  for (const trip of allTrips) {
    const lastViewed = viewedMap.get(trip.id);
    if (!lastViewed || trip.updatedAt > lastViewed) {
      return true;
    }
  }
  return false;
}
