import {
  pgTable,
  text,
  timestamp,
  date,
  pgEnum,
  real,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { bookings } from "./trips";

// ============================================
// CONVERSATIONS
// ============================================
export const conversations = pgTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: text("trip_id"),
  title: text("title"),
  modelUsed: text("model_used").default("claude-sonnet-4-6"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// TRAVEL INTELLIGENCE
// ============================================
export const travelTips = pgTable("travel_tips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  source: text("source").notNull(), // tpg, omaat, upgraded_points, gemini
  category: text("category"), // sweet_spot, deal, transfer_bonus, review
  title: text("title").notNull(),
  summary: text("summary"),
  url: text("url"),
  routeApplicable: text("route_applicable"), // "SFO-NRT" or null for general
  extractedAt: timestamp("extracted_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
});

// ============================================
// GLOBAL EVENTS & PRICING
// ============================================
export const eventImpactEnum = pgEnum("event_impact", [
  "low",
  "medium",
  "high",
]);

export const globalEvents = pgTable("global_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: text("type").notNull(), // conference, sports, holiday, festival, political, weather
  city: text("city"),
  country: text("country"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  expectedPriceImpact: eventImpactEnum("expected_price_impact").default("medium"),
  description: text("description"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const routePriceHistory = pgTable("route_price_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  cabinClass: text("cabin_class"),
  price: real("price").notNull(),
  currency: text("currency").default("USD"),
  airline: text("airline"),
  dataSource: text("data_source"), // amadeus, serpapi, manual
  searchedAt: timestamp("searched_at", { mode: "date" }).defaultNow().notNull(),
});

export const disruptionSeverityEnum = pgEnum("disruption_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const disruptionAlerts = pgTable("disruption_alerts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // strike, weather, airspace, cancellation, schedule_change
  airlinesAffected: jsonb("airlines_affected").$type<string[]>().default([]),
  routesAffected: jsonb("routes_affected").$type<string[]>().default([]),
  startDate: date("start_date"),
  endDate: date("end_date"),
  severity: disruptionSeverityEnum("severity").default("medium"),
  description: text("description"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
});

export const posMarketIntelligence = pgTable("pos_market_intelligence", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  originRegion: text("origin_region"),
  destinationRegion: text("destination_region"),
  routePattern: text("route_pattern"), // "US-South Asia"
  bestMarketCountry: text("best_market_country"), // "IN", "GB"
  avgSavingsPct: real("avg_savings_pct"),
  sampleCount: integer("sample_count").default(0),
  lastUpdated: timestamp("last_updated", { mode: "date" }).defaultNow(),
});

// ============================================
// PRICE ALERTS
// ============================================
export const priceAlerts = pgTable("price_alerts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  dateRangeStart: date("date_range_start"),
  dateRangeEnd: date("date_range_end"),
  cabinClass: text("cabin_class"),
  targetPrice: real("target_price"),
  currentBest: real("current_best"),
  isActive: boolean("is_active").default(true),
  lastChecked: timestamp("last_checked", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// TRAVEL REQUIREMENTS
// ============================================
export const travelRequirementsCache = pgTable("travel_requirements_cache", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  passportCountry: text("passport_country").notNull(),
  destinationCountry: text("destination_country").notNull(),
  visaRequired: boolean("visa_required"),
  visaType: text("visa_type"),
  visaUrl: text("visa_url"),
  passportValidityMonths: integer("passport_validity_months"),
  transitVisaNotes: text("transit_visa_notes"),
  vaccinationRequirements: jsonb("vaccination_requirements"),
  travelAdvisoryLevel: integer("travel_advisory_level"), // 1-4
  lastUpdated: timestamp("last_updated", { mode: "date" }).defaultNow(),
  source: text("source"),
});

// ============================================
// EXPENSES
// ============================================
export const tripExpenses = pgTable("trip_expenses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tripId: text("trip_id"),
  bookingId: text("booking_id"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // flight, hotel, car, meal, transport, other
  description: text("description"),
  amount: real("amount").notNull(),
  currency: text("currency").default("USD"),
  amountHomeCurrency: real("amount_home_currency"),
  exchangeRate: real("exchange_rate"),
  expenseDate: date("expense_date"),
  paymentCardId: text("payment_card_id"),
  isBusiness: boolean("is_business").default(false),
  receiptUrlEnc: text("receipt_url_enc"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// NOTIFICATIONS
// ============================================
export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  flightStatus: boolean("flight_status").default(true),
  checkInReminders: boolean("check_in_reminders").default(true),
  priceDrops: boolean("price_drops").default(true),
  transferBonuses: boolean("transfer_bonuses").default(true),
  creditExpiry: boolean("credit_expiry").default(true),
  passportExpiry: boolean("passport_expiry").default(true),
  preTripSummary: boolean("pre_trip_summary").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  actionUrl: text("action_url"),
  relatedTripId: text("related_trip_id"),
  relatedBookingId: text("related_booking_id"),
  readAt: timestamp("read_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// INTEGRATIONS
// ============================================
export const calendarEvents = pgTable("calendar_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookingId: text("booking_id"),
  segmentId: text("segment_id"),
  provider: text("provider").notNull(), // google, apple
  externalEventId: text("external_event_id"),
  syncedAt: timestamp("synced_at", { mode: "date" }).defaultNow(),
});

export const emailImports = pgTable("email_imports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gmailMessageId: text("gmail_message_id"),
  bookingId: text("booking_id"),
  parsedAt: timestamp("parsed_at", { mode: "date" }).defaultNow(),
});

// ============================================
// TRAVEL DOCUMENTS (future)
// ============================================
export const travelDocuments = pgTable("travel_documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: text("trip_id"),
  type: text("type").notNull(), // visa, arrival_card, eta, passport_copy, insurance, vaccination
  country: text("country"),
  status: text("status").default("not_started"), // not_started, in_progress, submitted, approved, denied
  documentDataJsonEnc: text("document_data_json_enc"),
  expiryDate: date("expiry_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================
// AUDIT LOG
// ============================================
export const auditLog = pgTable("audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
