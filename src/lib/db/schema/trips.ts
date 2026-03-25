import {
  pgTable,
  text,
  timestamp,
  date,
  pgEnum,
  jsonb,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { organizations } from "./organizations";

// ============================================
// TRIPS
// ============================================
export const tripStatusEnum = pgEnum("trip_status", [
  "planning",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
]);

export const trips = pgTable("trips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  destinationCity: text("destination_city"),
  destinationCountry: text("destination_country"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: tripStatusEnum("status").notNull().default("planning"),
  travelers: jsonb("travelers")
    .$type<{ userId?: string; name: string; role?: string }[]>()
    .default([]),
  notes: text("notes"),
  conversationId: text("conversation_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// BOOKINGS
// ============================================
export const bookingTypeEnum = pgEnum("booking_type", [
  "flight",
  "hotel",
  "car",
  "restaurant",
  "activity",
  "meeting",
  "transfer",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "draft",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const bookings = pgTable("bookings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripId: text("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  type: bookingTypeEnum("type").notNull(),
  status: bookingStatusEnum("status").notNull().default("draft"),
  pnrEnc: text("pnr_enc"),
  confirmationNumberEnc: text("confirmation_number_enc"),
  totalCost: real("total_cost"),
  currency: text("currency").default("USD"),
  paymentMethodId: text("payment_method_id"),
  pointsUsed: real("points_used"),
  pointsProgram: text("points_program"),
  vendorName: text("vendor_name"),
  vendorContact: text("vendor_contact"),
  checkInAt: timestamp("check_in_at", { mode: "date" }),
  checkOutAt: timestamp("check_out_at", { mode: "date" }),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// ITINERARY SEGMENTS
// ============================================
export const segmentTypeEnum = pgEnum("segment_type", [
  "flight",
  "hotel_night",
  "car_pickup",
  "car_return",
  "restaurant",
  "meeting",
  "activity",
  "transfer",
  "note",
]);

export const itinerarySegments = pgTable("itinerary_segments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id").references(() => bookings.id, {
    onDelete: "cascade",
  }),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  type: segmentTypeEnum("type").notNull(),
  sortOrder: integer("sort_order").default(0),
  // Common
  title: text("title"),
  description: text("description"),
  startAt: timestamp("start_at", { mode: "date" }),
  endAt: timestamp("end_at", { mode: "date" }),
  timezone: text("timezone"), // e.g. "Asia/Tokyo"
  // Location
  locationName: text("location_name"),
  locationAddress: text("location_address"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  locationGooglePlaceId: text("location_google_place_id"),
  // Flight-specific
  carrier: text("carrier"),
  flightNumber: text("flight_number"),
  origin: text("origin"),
  destination: text("destination"),
  cabinClass: text("cabin_class"),
  seat: text("seat"),
  terminal: text("terminal"),
  gate: text("gate"),
  // Confirmation
  confirmationEnc: text("confirmation_enc"),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// FARE RULES & PRICE MONITORING
// ============================================
export const cancelPolicyEnum = pgEnum("cancel_policy", [
  "full_refund",
  "credit",
  "partial",
  "none",
]);

export const bookingFareRules = pgTable("booking_fare_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  fareClass: text("fare_class"),
  fareBrand: text("fare_brand"),
  changeFee: real("change_fee"),
  changeFeeCurrency: text("change_fee_currency").default("USD"),
  cancelPolicy: cancelPolicyEnum("cancel_policy").default("none"),
  sameDayChange: boolean("same_day_change").default(false),
  upgradeEligible: boolean("upgrade_eligible").default(false),
  refundable: boolean("refundable").default(false),
  flexibilityScore: integer("flexibility_score"), // 0-100
  rulesRaw: jsonb("rules_raw"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const priceWatches = pgTable("price_watches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id").references(() => bookings.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  travelDate: date("travel_date"),
  cabinClass: text("cabin_class"),
  originalPrice: real("original_price"),
  currentBestPrice: real("current_best_price"),
  savingsAvailable: real("savings_available"),
  lastChecked: timestamp("last_checked", { mode: "date" }),
  alertSentAt: timestamp("alert_sent_at", { mode: "date" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const creditStatusEnum = pgEnum("credit_status", [
  "active",
  "partially_used",
  "used",
  "expired",
]);

export const airlineCredits = pgTable("airline_credits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  airline: text("airline").notNull(),
  creditAmount: real("credit_amount").notNull(),
  currency: text("currency").default("USD"),
  creditCodeEnc: text("credit_code_enc"),
  issuedDate: date("issued_date"),
  expiryDate: date("expiry_date"),
  usedAmount: real("used_amount").default(0),
  status: creditStatusEnum("status").default("active"),
  bookingIdSource: text("booking_id_source"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// USER TRAVEL HISTORY
// ============================================
export const userTravelHistory = pgTable("user_travel_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: text("trip_id").references(() => trips.id, { onDelete: "set null" }),
  bookingId: text("booking_id").references(() => bookings.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // flight, hotel, restaurant, car
  vendor: text("vendor"),
  routeOrLocation: text("route_or_location"), // "SFO→NRT" or "Park Hyatt Tokyo"
  cabinClass: text("cabin_class"),
  roomType: text("room_type"),
  rating: integer("rating"), // 1-5
  liked: boolean("liked"),
  notes: text("notes"),
  traveledAt: timestamp("traveled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// TRIP TEMPLATES & SHARING
// ============================================
export const tripTemplates = pgTable("trip_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  templateData: jsonb("template_data").default({}),
  useCount: integer("use_count").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const sharePermissionEnum = pgEnum("share_permission", [
  "view",
  "collaborate",
]);

export const tripShares = pgTable("trip_shares", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  shareToken: text("share_token").notNull().unique(),
  permissions: sharePermissionEnum("permissions").default("view"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// Trip Activity Log
// ============================================
export const tripActivityLog = pgTable("trip_activity_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g. "flight_added", "hotel_added", "trip_updated", "permission_changed"
  description: text("description").notNull(), // Human-readable: "Robin added TAP TP1351 LHR→LIS"
  metadata: jsonb("metadata"), // Extra data: { segmentId, flightNumber, etc. }
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Track when a user last viewed a trip (for "new update" dot)
export const tripLastViewed = pgTable("trip_last_viewed", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { mode: "date" }).defaultNow().notNull(),
});
