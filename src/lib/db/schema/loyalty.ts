import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { organizations } from "./organizations";

export const ffPrograms = pgTable("ff_programs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  airlineCode: text("airline_code").notNull(), // IATA code: UA, AA, DL
  programName: text("program_name").notNull(),
  memberNumberEnc: text("member_number_enc"), // encrypted
  statusLevel: text("status_level"), // Gold, Platinum, 1K, etc.
  priorityPhone: text("priority_phone"),
  priorityEmail: text("priority_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const hotelPrograms = pgTable("hotel_programs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hotelChain: text("hotel_chain").notNull(), // hyatt, marriott, hilton
  programName: text("program_name").notNull(),
  memberNumberEnc: text("member_number_enc"), // encrypted
  statusLevel: text("status_level"),
  priorityPhone: text("priority_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const portalEnum = pgEnum("card_portal", [
  "chase",
  "amex",
  "capital_one",
  "none",
]);

export const creditCards = pgTable("credit_cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  nickname: text("nickname").notNull(), // "Chase Sapphire Reserve"
  cardType: text("card_type").notNull(), // visa, amex, mastercard
  lastFour: text("last_four").notNull(),
  issuer: text("issuer").notNull(), // chase, amex, capital_one
  portal: portalEnum("portal").notNull().default("none"),
  earnRates: jsonb("earn_rates").default({}), // {"travel": 3, "dining": 3, "other": 1}
  noForeignTxFee: boolean("no_foreign_tx_fee").default(false),
  isOrgCard: boolean("is_org_card").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const pointBalances = pgTable("point_balances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  program: text("program").notNull(), // chase_ur, amex_mr, cap1, united, hyatt, etc.
  programName: text("program_name").notNull(),
  balance: real("balance").default(0),
  lastUpdated: timestamp("last_updated", { mode: "date" }).defaultNow(),
});

export const transferPartners = pgTable("transfer_partners", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardProgram: text("card_program").notNull(), // chase_ur, amex_mr, cap1
  airlineProgram: text("airline_program").notNull(),
  ratioFrom: real("ratio_from").notNull().default(1),
  ratioTo: real("ratio_to").notNull().default(1),
  isActive: boolean("is_active").default(true),
});

export const transferBonuses = pgTable("transfer_bonuses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardProgram: text("card_program").notNull(),
  partner: text("partner").notNull(),
  bonusPct: real("bonus_pct").notNull(), // 30 = 30% bonus
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
