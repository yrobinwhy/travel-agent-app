"use server";

import { db } from "@/lib/db";
import {
  ffPrograms,
  hotelPrograms,
  creditCards,
  pointBalances,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

// ============================================
// FREQUENT FLYER PROGRAMS
// ============================================

export async function getUserFFPrograms() {
  const user = await getUser();
  const programs = await db
    .select()
    .from(ffPrograms)
    .where(eq(ffPrograms.userId, user.id!));

  return programs.map((p) => ({
    ...p,
    memberNumber: p.memberNumberEnc ? decrypt(p.memberNumberEnc) : null,
  }));
}

export async function createFFProgram(formData: FormData) {
  const user = await getUser();

  const memberNumber = formData.get("memberNumber") as string;

  const [program] = await db
    .insert(ffPrograms)
    .values({
      userId: user.id!,
      airlineCode: (formData.get("airlineCode") as string).toUpperCase(),
      programName: formData.get("programName") as string,
      memberNumberEnc: memberNumber ? encrypt(memberNumber) : null,
      statusLevel: formData.get("statusLevel") as string,
      priorityPhone: formData.get("priorityPhone") as string,
      priorityEmail: formData.get("priorityEmail") as string,
      notes: formData.get("notes") as string,
    })
    .returning();

  revalidatePath("/points");
}

export async function updateFFProgram(formData: FormData) {
  const user = await getUser();
  const id = formData.get("id") as string;

  const memberNumber = formData.get("memberNumber") as string;

  await db
    .update(ffPrograms)
    .set({
      airlineCode: (formData.get("airlineCode") as string).toUpperCase(),
      programName: formData.get("programName") as string,
      memberNumberEnc: memberNumber ? encrypt(memberNumber) : null,
      statusLevel: formData.get("statusLevel") as string,
      priorityPhone: formData.get("priorityPhone") as string,
      priorityEmail: formData.get("priorityEmail") as string,
      notes: formData.get("notes") as string,
      updatedAt: new Date(),
    })
    .where(and(eq(ffPrograms.id, id), eq(ffPrograms.userId, user.id!)));

  revalidatePath("/points");
  revalidatePath("/cards");
}

export async function deleteFFProgram(id: string) {
  const user = await getUser();
  await db
    .delete(ffPrograms)
    .where(and(eq(ffPrograms.id, id), eq(ffPrograms.userId, user.id!)));
  revalidatePath("/points");
  revalidatePath("/cards");
}

// ============================================
// HOTEL PROGRAMS
// ============================================

export async function getUserHotelPrograms() {
  const user = await getUser();
  const programs = await db
    .select()
    .from(hotelPrograms)
    .where(eq(hotelPrograms.userId, user.id!));

  return programs.map((p) => ({
    ...p,
    memberNumber: p.memberNumberEnc ? decrypt(p.memberNumberEnc) : null,
  }));
}

export async function createHotelProgram(formData: FormData) {
  const user = await getUser();

  const memberNumber = formData.get("memberNumber") as string;

  const [program] = await db
    .insert(hotelPrograms)
    .values({
      userId: user.id!,
      hotelChain: formData.get("hotelChain") as string,
      programName: formData.get("programName") as string,
      memberNumberEnc: memberNumber ? encrypt(memberNumber) : null,
      statusLevel: formData.get("statusLevel") as string,
      priorityPhone: formData.get("priorityPhone") as string,
      notes: formData.get("notes") as string,
    })
    .returning();

  revalidatePath("/points");
}

export async function updateHotelProgram(formData: FormData) {
  const user = await getUser();
  const id = formData.get("id") as string;

  const memberNumber = formData.get("memberNumber") as string;

  await db
    .update(hotelPrograms)
    .set({
      hotelChain: formData.get("hotelChain") as string,
      programName: formData.get("programName") as string,
      memberNumberEnc: memberNumber ? encrypt(memberNumber) : null,
      statusLevel: formData.get("statusLevel") as string,
      priorityPhone: formData.get("priorityPhone") as string,
      notes: formData.get("notes") as string,
      updatedAt: new Date(),
    })
    .where(and(eq(hotelPrograms.id, id), eq(hotelPrograms.userId, user.id!)));

  revalidatePath("/points");
  revalidatePath("/cards");
}

export async function deleteHotelProgram(id: string) {
  const user = await getUser();
  await db
    .delete(hotelPrograms)
    .where(and(eq(hotelPrograms.id, id), eq(hotelPrograms.userId, user.id!)));
  revalidatePath("/points");
  revalidatePath("/cards");
}

// ============================================
// CREDIT CARDS
// ============================================

export async function getUserCreditCards() {
  const user = await getUser();
  return await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.userId, user.id!));
}

export async function createCreditCard(formData: FormData) {
  const user = await getUser();

  const earnRatesStr = formData.get("earnRates") as string;
  let earnRates = {};
  try {
    if (earnRatesStr) earnRates = JSON.parse(earnRatesStr);
  } catch {
    // ignore parse errors
  }

  const [card] = await db
    .insert(creditCards)
    .values({
      userId: user.id!,
      orgId: (formData.get("orgId") as string) || null,
      nickname: formData.get("nickname") as string,
      cardType: formData.get("cardType") as string,
      lastFour: formData.get("lastFour") as string,
      issuer: formData.get("issuer") as string,
      portal: (formData.get("portal") as "chase" | "amex" | "capital_one" | "none") || "none",
      earnRates,
      noForeignTxFee: formData.get("noForeignTxFee") === "true",
      isOrgCard: formData.get("isOrgCard") === "true",
    })
    .returning();

  revalidatePath("/cards");
}

export async function updateCreditCard(formData: FormData) {
  const user = await getUser();
  const id = formData.get("id") as string;

  const earnRatesStr = formData.get("earnRates") as string;
  let earnRates = {};
  try {
    if (earnRatesStr) earnRates = JSON.parse(earnRatesStr);
  } catch {
    // ignore
  }

  await db
    .update(creditCards)
    .set({
      nickname: formData.get("nickname") as string,
      cardType: formData.get("cardType") as string,
      lastFour: formData.get("lastFour") as string,
      issuer: formData.get("issuer") as string,
      portal: (formData.get("portal") as "chase" | "amex" | "capital_one" | "none") || "none",
      earnRates,
      noForeignTxFee: formData.get("noForeignTxFee") === "true",
      isOrgCard: formData.get("isOrgCard") === "true",
    })
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id!)));

  revalidatePath("/points");
  revalidatePath("/cards");
}

export async function deleteCreditCard(id: string) {
  const user = await getUser();
  await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id!)));
  revalidatePath("/points");
  revalidatePath("/cards");
}

// ============================================
// POINT BALANCES
// ============================================

export async function getUserPointBalances() {
  const user = await getUser();
  return await db
    .select()
    .from(pointBalances)
    .where(eq(pointBalances.userId, user.id!));
}

export async function upsertPointBalance(formData: FormData) {
  const user = await getUser();
  const program = formData.get("program") as string;
  const programName = formData.get("programName") as string;
  const balance = parseFloat(formData.get("balance") as string) || 0;

  const existing = await db
    .select()
    .from(pointBalances)
    .where(
      and(
        eq(pointBalances.userId, user.id!),
        eq(pointBalances.program, program)
      )
    );

  if (existing.length > 0) {
    await db
      .update(pointBalances)
      .set({ balance, lastUpdated: new Date(), programName })
      .where(eq(pointBalances.id, existing[0].id));
  } else {
    await db.insert(pointBalances).values({
      userId: user.id!,
      program,
      programName,
      balance,
    });
  }

  revalidatePath("/points");
  revalidatePath("/cards");
}
