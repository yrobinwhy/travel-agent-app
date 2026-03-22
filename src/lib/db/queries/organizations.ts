"use server";

import { db } from "@/lib/db";
import { organizations, orgMemberships, orgInvites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getUserOrgs() {
  const user = await getUser();
  const memberships = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      joinedAt: orgMemberships.joinedAt,
      orgName: organizations.name,
      orgType: organizations.type,
      ownerId: organizations.ownerId,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, user.id!));

  return memberships;
}

export async function getOrgMembers(orgId: string) {
  const user = await getUser();
  // Verify user belongs to this org
  const membership = await db
    .select()
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, user.id!))
    );
  if (membership.length === 0) throw new Error("Not a member of this org");

  const members = await db
    .select({
      membershipId: orgMemberships.id,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      joinedAt: orgMemberships.joinedAt,
    })
    .from(orgMemberships)
    .where(eq(orgMemberships.orgId, orgId));

  return members;
}

export async function createOrg(formData: FormData) {
  const user = await getUser();
  const name = formData.get("name") as string;
  const type = formData.get("type") as "family" | "business";

  if (!name || !type) throw new Error("Name and type are required");

  const [org] = await db
    .insert(organizations)
    .values({ name, type, ownerId: user.id! })
    .returning();

  // Add owner as member
  await db.insert(orgMemberships).values({
    userId: user.id!,
    orgId: org.id,
    role: "owner",
  });

  revalidatePath("/admin");
}

export async function createInvite(formData: FormData) {
  const user = await getUser();
  const orgId = formData.get("orgId") as string;
  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "member";

  // Verify user is owner or admin
  const membership = await db
    .select()
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, user.id!))
    );
  if (
    membership.length === 0 ||
    !["owner", "admin"].includes(membership[0].role)
  ) {
    throw new Error("Only owners and admins can invite members");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db
    .insert(orgInvites)
    .values({
      orgId,
      email,
      role: role as "owner" | "admin" | "member" | "viewer",
      token,
      expiresAt,
    })
    .returning();

  revalidatePath("/admin");
}

export async function deleteInvite(formData: FormData) {
  const user = await getUser();
  const inviteId = formData.get("inviteId") as string;
  const orgId = formData.get("orgId") as string;

  // Verify user is owner or admin of the org
  const membership = await db
    .select()
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, user.id!))
    );
  if (
    membership.length === 0 ||
    !["owner", "admin"].includes(membership[0].role)
  ) {
    throw new Error("Only owners and admins can delete invites");
  }

  await db.delete(orgInvites).where(eq(orgInvites.id, inviteId));
  revalidatePath("/admin");
}

export async function getOrgInvites(orgId: string) {
  const user = await getUser();
  // Verify user belongs to this org
  const membership = await db
    .select()
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, user.id!))
    );
  if (membership.length === 0) throw new Error("Not a member of this org");

  return await db
    .select()
    .from(orgInvites)
    .where(eq(orgInvites.orgId, orgId));
}

export async function acceptInvite(token: string) {
  const user = await getUser();

  const [invite] = await db
    .select()
    .from(orgInvites)
    .where(eq(orgInvites.token, token));

  if (!invite) throw new Error("Invalid invite");
  if (invite.acceptedAt) throw new Error("Invite already accepted");
  if (invite.expiresAt < new Date()) throw new Error("Invite expired");

  // Add user to org
  await db.insert(orgMemberships).values({
    userId: user.id!,
    orgId: invite.orgId,
    role: invite.role,
  });

  // Mark invite as accepted
  await db
    .update(orgInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(orgInvites.id, invite.id));

  return invite;
}

export async function removeMember(orgId: string, memberUserId: string) {
  const user = await getUser();

  // Verify requester is owner or admin
  const membership = await db
    .select()
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, user.id!))
    );
  if (
    membership.length === 0 ||
    !["owner", "admin"].includes(membership[0].role)
  ) {
    throw new Error("Only owners and admins can remove members");
  }

  // Can't remove the owner
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));
  if (org.ownerId === memberUserId)
    throw new Error("Cannot remove the org owner");

  await db
    .delete(orgMemberships)
    .where(
      and(
        eq(orgMemberships.orgId, orgId),
        eq(orgMemberships.userId, memberUserId)
      )
    );
}
