import {
  pgTable,
  text,
  timestamp,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const userProfiles = pgTable("user_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  // Preferences
  seatPref: text("seat_pref"), // window, aisle, middle
  mealPref: text("meal_pref"),
  cabinClassPref: text("cabin_class_pref"), // economy, premium_economy, business, first
  // Travel documents (encrypted)
  passportNumberEnc: text("passport_number_enc"),
  passportExpiry: date("passport_expiry"),
  passportCountry: text("passport_country"),
  tsaPrecheckNumberEnc: text("tsa_precheck_number_enc"),
  globalEntryNumberEnc: text("global_entry_number_enc"),
  knownTravelerIdEnc: text("known_traveler_id_enc"),
  // Contact
  phone: text("phone"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  // Future: visa/arrival card auto-fill
  dateOfBirthEnc: text("date_of_birth_enc"),
  nationality: text("nationality"),
  placeOfBirth: text("place_of_birth"),
  addressJsonEnc: text("address_json_enc"), // encrypted JSON
  employerName: text("employer_name"),
  employerAddress: text("employer_address"),
  // Timestamps
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  preferredAirlines: jsonb("preferred_airlines").$type<string[]>().default([]),
  preferredHotels: jsonb("preferred_hotels").$type<string[]>().default([]),
  preferredAirports: jsonb("preferred_airports").$type<string[]>().default([]),
  homeAirport: text("home_airport"),
  defaultCabinClass: text("default_cabin_class").default("business"),
  defaultOptimizationMode: text("default_optimization_mode").default("best_value"),
  dietaryRestrictions: text("dietary_restrictions"),
  accessibilityNeeds: text("accessibility_needs"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
