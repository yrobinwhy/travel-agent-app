"use server";

import { db } from "@/lib/db";
import { userProfiles, userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getUserProfile() {
  const user = await getUser();
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id!));

  if (!profile) return null;

  // Decrypt sensitive fields for display
  return {
    ...profile,
    passportNumber: profile.passportNumberEnc
      ? decrypt(profile.passportNumberEnc)
      : null,
    tsaPrecheckNumber: profile.tsaPrecheckNumberEnc
      ? decrypt(profile.tsaPrecheckNumberEnc)
      : null,
    globalEntryNumber: profile.globalEntryNumberEnc
      ? decrypt(profile.globalEntryNumberEnc)
      : null,
    knownTravelerId: profile.knownTravelerIdEnc
      ? decrypt(profile.knownTravelerIdEnc)
      : null,
    dateOfBirth: profile.dateOfBirthEnc
      ? decrypt(profile.dateOfBirthEnc)
      : null,
    addressJson: profile.addressJsonEnc
      ? JSON.parse(decrypt(profile.addressJsonEnc))
      : null,
  };
}

export async function upsertUserProfile(formData: FormData) {
  const user = await getUser();

  const data: Record<string, unknown> = {
    userId: user.id!,
    seatPref: formData.get("seatPref") as string,
    mealPref: formData.get("mealPref") as string,
    cabinClassPref: formData.get("cabinClassPref") as string,
    phone: formData.get("phone") as string,
    emergencyContactName: formData.get("emergencyContactName") as string,
    emergencyContactPhone: formData.get("emergencyContactPhone") as string,
    nationality: formData.get("nationality") as string,
    placeOfBirth: formData.get("placeOfBirth") as string,
    employerName: formData.get("employerName") as string,
    employerAddress: formData.get("employerAddress") as string,
    passportCountry: formData.get("passportCountry") as string,
    passportExpiry: formData.get("passportExpiry") as string || null,
    updatedAt: new Date(),
  };

  // Encrypt sensitive fields
  const passportNumber = formData.get("passportNumber") as string;
  if (passportNumber) data.passportNumberEnc = encrypt(passportNumber);

  const tsaPrecheck = formData.get("tsaPrecheckNumber") as string;
  if (tsaPrecheck) data.tsaPrecheckNumberEnc = encrypt(tsaPrecheck);

  const globalEntry = formData.get("globalEntryNumber") as string;
  if (globalEntry) data.globalEntryNumberEnc = encrypt(globalEntry);

  const knownTraveler = formData.get("knownTravelerId") as string;
  if (knownTraveler) data.knownTravelerIdEnc = encrypt(knownTraveler);

  const dateOfBirth = formData.get("dateOfBirth") as string;
  if (dateOfBirth) data.dateOfBirthEnc = encrypt(dateOfBirth);

  const address = formData.get("address") as string;
  if (address) data.addressJsonEnc = encrypt(address);

  // Check if profile exists
  const existing = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id!));

  if (existing.length > 0) {
    await db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.userId, user.id!));
  } else {
    await db.insert(userProfiles).values(data as typeof userProfiles.$inferInsert);
  }

  revalidatePath("/settings");
}

export async function getUserPreferences() {
  const user = await getUser();
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id!));

  return prefs || null;
}

export async function upsertUserPreferences(formData: FormData) {
  const user = await getUser();

  const preferredAirlines = (formData.get("preferredAirlines") as string)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) || [];
  const preferredHotels = (formData.get("preferredHotels") as string)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) || [];
  const preferredAirports = (formData.get("preferredAirports") as string)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) || [];

  const data = {
    userId: user.id!,
    preferredAirlines,
    preferredHotels,
    preferredAirports,
    homeAirport: formData.get("homeAirport") as string,
    defaultCabinClass: formData.get("defaultCabinClass") as string,
    defaultOptimizationMode: formData.get("defaultOptimizationMode") as string,
    dietaryRestrictions: formData.get("dietaryRestrictions") as string,
    accessibilityNeeds: formData.get("accessibilityNeeds") as string,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id!));

  if (existing.length > 0) {
    await db
      .update(userPreferences)
      .set(data)
      .where(eq(userPreferences.userId, user.id!));
  } else {
    await db.insert(userPreferences).values(data);
  }

  revalidatePath("/settings");
}
