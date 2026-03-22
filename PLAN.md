# TravelAgent Pro — Comprehensive Build Plan

## Overview

A full-featured travel agent web app for personal (family of 4) and business (5+ colleagues, expandable to other organizations). Combines multi-model LLM intelligence, flight search APIs, loyalty point optimization, and natural language interaction into a secure, production-grade platform.

**Primary interface: Natural language chat.** Users describe entire trips in plain English ("I need flights to Tokyo Mar 15-20, hotel near Shibuya, car rental, dinner reservation near the office Thursday night"). The LLM orchestrates all searches, builds a unified itinerary, and learns from the user's history to prioritize previously enjoyed routes, hotels, airlines, and seats.

**GitHub:** https://github.com/yrobinwhy/travel-agent-app
**Hosting:** Vercel default domain (custom domain later)

### Future Expansion (schema designed for these from day 1)
- Visa applications & electronic arrival cards (auto-fill from stored passport/travel data)
- Restaurant reservations (OpenTable / Resy API integration)
- Google Maps integration (visual trip map with all pins)
- Additional organizations / white-label potential

---

## 1. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, API routes, Vercel-native |
| UI | shadcn/ui + Tailwind CSS | Polished, accessible, fast to build |
| Auth | Auth.js v5 (NextAuth) | Google OAuth + email magic links |
| Database | Neon Postgres (serverless) | Branching, serverless, scales to zero |
| ORM | Drizzle ORM | Type-safe, lightweight, great DX |
| Encryption | AES-256-GCM (Web Crypto) | Credit card last-4, FF numbers, PNRs |
| Background Jobs | Trigger.dev on Railway | Price alerts, calendar sync, TPG scraping |
| Deployment | Vercel (app) + Neon (db) + Railway (workers) | Per requirements |
| Monitoring | Sentry + Vercel Analytics | Errors + performance |
| Language | TypeScript (strict) | End-to-end type safety |

---

## 2. Multi-Model LLM Architecture

### Model Selection by Task

| Component | Model | Cost (per 1M tokens) | Rationale |
|---|---|---|---|
| Intent parsing / routing | Claude Haiku 4.5 | $1 / $5 | Fast, cheap, precise extraction of user intent from natural language |
| Flight data extraction | Gemini 2.5 Flash | $0.30 / $2.50 | Best cost/performance for structured data extraction at volume |
| Deep reasoning / point optimization | Claude Sonnet 4.6 (default) | $3 / $15 | Superior multi-constraint reasoning for complex valuations |
| Real-time travel research & TPG scraping | Gemini 2.5 Pro + Google Search Grounding | $1.25 / $10 + $35/1K queries | Native Google Search for current deals, reviews, bonuses |
| Conversational interface | Claude Sonnet 4.6 (default) | $3 / $15 | Best instruction-following for multi-part travel requests |
| Supplementary web research | Tavily API + any model | ~$5-16/1K searches | Model-agnostic fallback for non-Google research |

### Model Router Design

```
User Input (natural language)
    │
    ▼
┌─────────────────────────┐
│  Claude Haiku 4.5       │  ← Intent classification + parameter extraction
│  (fast, cheap router)   │
└────────┬────────────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼
 Flight    Point      Research   Booking    General
 Search    Optimize   & Tips    Assist      Chat
    │         │          │          │          │
    ▼         ▼          ▼          ▼          ▼
 Gemini    Claude     Gemini    Claude     Claude
 Flash     Sonnet     Pro+GSG   Sonnet     Sonnet
```

### User-Facing Model Controls
- Settings page shows current default model (Claude Sonnet 4.6)
- Users can switch default to: GPT-4.1, Gemini 2.5 Pro, or any supported model
- Per-task model overrides available in advanced settings
- Model used is shown in each response (subtle badge)
- Cost tracking per user/org visible in admin dashboard

### API Keys Required
- Anthropic (Claude) — primary reasoning + conversation
- Google AI (Gemini) — search grounding + data extraction
- OpenAI (GPT) — optional, user can enable as alternative
- Tavily — supplementary web search
- SerpAPI — Google Flights SERP data (backup to Amadeus)

---

## 3. Flight Search & Optimization Engine

### Data Sources (Priority Order)
1. **Amadeus Self-Service API** — primary source, covers ~400 airlines, free tier available
2. **SerpAPI Google Flights** — backup/cross-reference, real SERP data
3. **Duffel API** — modern alternative to Amadeus, good for booking flow
4. **Kiwi Tequila API** — good for creative routing (virtual interlining)

### Search Flow
```
User: "Find me business class to Tokyo in April, flexible dates"
    │
    ▼
Haiku 4.5 extracts:
  - destination: NRT/HND
  - class: business
  - dates: April 2027 (flexible ±3 days)
  - preferences: user profile (preferred airlines, status, etc.)
    │
    ▼
Parallel API calls (per market):
  ├── Amadeus Flight Offers Search (POS: US)
  ├── Amadeus Flight Offers Search (POS: destination country)
  ├── Amadeus Flight Offers Search (POS: known cheap markets for route)
  ├── SerpAPI Google Flights (cross-reference)
  └── Kiwi (creative routing options)
    │
    ▼
Gemini 2.5 Flash: Normalize + structure + deduplicate across markets
    │
    ▼
Claude Sonnet: Analyze & rank by user's optimization mode
  - Best Value: business class quality per dollar
  - Best Points: cents-per-point across all programs
  - Best Schedule: minimize travel time
  - Fewest Stops: prefer direct
  - Creative: hidden city, positioning flights, etc.
    │
    ▼
Present ranked results with reasoning
```

### Optimization Modes
1. **Best Value** — price per mile in business/first, seat quality (1-2-1 vs 2-3-2), lounge access
2. **Best Points** — calculate cpp across Chase UR, Amex MR, Capital One Miles; factor in transfer bonuses
3. **Best Schedule** — total travel time, departure/arrival windows, connection quality
4. **Fewest Stops** — direct flights prioritized, acceptable connection cities
5. **Creative Routing** — LLM suggests positioning flights, fifth-freedom routes, fuel dumps
6. **Most Flexible** — prioritize refundable/changeable fares for maximum optionality
7. **Cheapest Market** — find the lowest price across all points of sale

### Point of Sale (POS) Arbitrage Engine

Airlines use different pricing for different markets. The Amadeus API natively supports
a `salesChannelCode` and market override, so this is a legitimate GDS feature — no VPN or
location spoofing required.

```
For each flight search:
1. Identify candidate markets:
   a. User's home country (US)
   b. Destination country (India, Japan, etc.)
   c. Route-learned cheap markets (from pos_market_history)
   d. Common arbitrage markets: India, UK, Scandinavia, Singapore, Brazil
2. Fire parallel Amadeus searches with different POS country codes
3. Normalize all results to USD (or user's preferred currency)
4. Flag FX fees: check if user's cards charge foreign transaction fees
   (CSR: no, Amex Plat: no, Venture X: no — all 3 are FTF-free)
5. Compare fare rules across markets (some markets = different T&Cs)
6. Present winner with full breakdown:
   "UA 83 JFK→DEL Business:
    - US market: $2,400
    - India market: ₹136,000 ($1,620 at today's rate)
    - UK market: £1,510 ($1,890)
    → Book via India market on Air India website. Save $780.
      Your CSR has no foreign transaction fee."
```

Over time, the system builds a `pos_market_intelligence` table that learns which markets
are consistently cheapest for which routes, so it can prioritize the right markets first
and reduce API calls.

Database additions:
```sql
pos_market_intelligence (
  id, origin_region, destination_region,
  route_pattern,  -- "US-South Asia", "US-Europe", "Intra-Asia"
  best_market_country,  -- "IN", "GB", "SE"
  avg_savings_pct,  -- 15 means 15% cheaper on average
  sample_count,     -- how many searches this is based on
  last_updated
)
```

Key implementation note: Amadeus Self-Service API supports the `currencyCode` parameter
and can return fares in different currencies. For the full POS override (which changes
the actual fare filing), the Enterprise tier API is needed. We start with currency +
SerpAPI cross-market search, and upgrade to Enterprise Amadeus when volume justifies it.

### Nearby Airport & Creative Routing Engine

For every search, the system automatically expands the search to nearby airports and evaluates positioning flight combos.

```
For each flight search:
1. Identify alternate airports within configurable radius (default: 150mi / 250km):
   a. Origin alternates: e.g., SFO search also checks OAK, SJC
   b. Destination alternates: e.g., LAS search also checks PHX, ONT
   c. Use IATA metropolitan area codes when available (NYC = JFK/EWR/LGA)

2. Run standard search across all origin × destination pairs (parallel)

3. For any alternate airport result that's significantly cheaper ($200+ savings default):
   a. Search for positioning flight: user's home → alternate airport
   b. Calculate: positioning flight + main flight vs. direct from home
   c. Factor in: extra time, layover comfort, luggage re-check rules

4. Multi-leg positioning evaluation:
   a. If BCN→LHR→LAS = $650 total (incl. BCN→LHR leg) vs LHR→LAS direct = $1,200
   b. Present: "Save $550 by adding BCN→LHR positioning leg. Adds 3hrs, overnight in Barcelona optional."

5. Open-jaw evaluation:
   a. For multi-city trips, compare: A→B + C→A vs. A→B→A + B→C→B
   b. Present cheapest combination with clear routing

6. One-way combo check:
   a. Compare round-trip on single airline vs. two one-ways on different airlines
   b. Especially useful for routes where outbound/return demand is asymmetric
```

Database additions:
```sql
nearby_airports (
  id, airport_code, nearby_code,
  distance_miles, same_metro_area,
  ground_transport_options_json,  -- "Eurostar 2h15m", "Bus $15 1h"
  created_at
)
```

### Smart Pricing Engine (Economy + Upgrade Strategy)

For every flight search, the system doesn't just compare ticket prices at face value. It evaluates hybrid strategies:

```
For each flight result:
1. Pull pricing for all cabin classes (economy, premium economy, business, first)
2. For each economy/PE fare:
   a. Check if fare class is upgrade-eligible
   b. Query upgrade availability (miles, cash, bid)
   c. Calculate: base fare + upgrade cost vs. direct premium purchase
   d. Factor in mileage earning difference between fare classes
   e. Factor in user's elite status (complimentary upgrade probability)
3. Score each path:
   - Path A: Economy $800 + 25K miles upgrade = ~$1,300 total value
   - Path B: Business $3,200 direct = $3,200
   - Path C: Economy $800 + cash upgrade bid ~$500 = ~$1,300
   - Path D: Economy $800 + hope for complimentary (user is 1K) = $800 + risk
4. Present top paths with risk assessment
```

Data sources for upgrade availability:
- Amadeus fare rules API (fare class restrictions)
- ExpertFlyer / SeatSpy (upgrade availability, waitlist depth) — if APIs available
- Airline-specific (United, AA publish upgrade inventory differently)

### Event-Aware Pricing Intelligence

Background service that monitors global events and correlates with flight pricing.

```
Data Sources:
├── PredictHQ API — global events database (conferences, sports, festivals)
├── Airline disruption feeds — strikes, schedule changes, cancellations
├── News monitoring via Gemini Search — geopolitical events, weather
├── Historical pricing data — our own database of past searches
└── Google Flights pricing trends — via SerpAPI

Analysis Pipeline (runs on Railway cron, daily):
1. For all active price alerts + recently searched routes:
   a. Check for events at origin/destination that overlap travel dates
   b. Compare current price to historical average for route + season
   c. Flag anomalies: >30% above historical = likely event-driven spike
   d. Check for disruption risks: strikes announced, weather forecasts, airspace issues
2. Generate alerts:
   - SPIKE: "CES in Las Vegas Jan 7-10 — expect 3x pricing. Consider alt dates/airports."
   - DISRUPTION: "Lufthansa pilot strike announced for Mar 18-20. Your FRA connection at risk."
   - OPPORTUNITY: "Route SFO→LHR dropped 22% this week. Below historical average."
   - MISTAKE FARE: "SFO→NRT business class $900 on [airline] — 70% below normal. May not last."
```

Database tables for this:
```sql
global_events (id, name, type[conference|sports|holiday|festival|political], city, country, start_date, end_date, expected_impact[low|medium|high], source, created_at)
route_price_history (id, origin, destination, cabin_class, price, currency, airline, searched_at)  -- populated from every search
disruption_alerts (id, type[strike|weather|airspace|cancellation], airlines_affected, routes_affected, start_date, end_date, severity, source_url, created_at)
```

### Flexible Ticket Strategy & Post-Booking Monitoring

Every booking enters a monitoring pipeline:

```
On booking creation:
1. Record: route, fare class, fare rules (refundable? changeable? fee?), price paid
2. Parse fare rules into structured data:
   - change_fee: $0 | $amount | not_allowed
   - cancel_refund: full | partial | credit | none
   - same_day_change: yes | no
   - upgrade_eligible: yes | no
3. Calculate "flexibility score" (0-100) displayed on booking card

Post-booking monitoring (daily cron):
1. Re-search the same route + dates + cabin
2. If price dropped:
   a. Calculate savings: (old price - new price) - change fee
   b. If net savings > threshold ($50 default, configurable):
      - Alert user: "Your flight dropped $400. Changeable for $0 fee. Save $400?"
      - Prepare rebooking action (API if Amadeus, instructions if manual)
3. If flight cancelled/changed by airline:
   a. Alert immediately
   b. Search alternatives
   c. Surface priority contact number for user's status level

Credit/voucher tracking:
- Store airline credits from cancellations
- Track expiry dates
- Remind user when credits are expiring (30 days, 7 days)
- LLM suggests credits when searching relevant airlines
```

Database additions:
```sql
booking_fare_rules (id, booking_id, fare_class, change_fee, cancel_policy[full_refund|credit|partial|none], same_day_change, upgrade_eligible, rules_raw_json)
price_watches (id, booking_id, route, dates, cabin_class, original_price, current_best, last_checked, savings_available, alert_sent)
airline_credits (id, user_id, airline, credit_amount, currency, credit_code_enc, issued_date, expiry_date, used_amount, status[active|used|expired], notes)
```

---

## 3b. Agent Email & Chat Layer

An autonomous AI agent that monitors communications and proactively manages travel context.

### Email Agent Pipeline
```
Gmail API (watch mode) → New email arrives
    │
    ▼
Claude Haiku 4.5: Classify email
  - Is this travel-related? (booking confirmation, schedule change, meeting invite with location, etc.)
  - Classification: booking_confirmation | schedule_change | meeting_invite | travel_request | not_travel
    │
    ▼
If travel-related:
  ├── booking_confirmation → Parse details, match to existing trip or create new one
  ├── schedule_change → Update itinerary, alert user if conflicts created
  ├── meeting_invite → Extract location, suggest flight/hotel search if different city
  ├── travel_request → Surface as suggested action ("Your boss asked about the NYC trip — want me to search?")
  └── duplicate_check → Cross-reference with existing bookings to prevent double-booking
```

### Architecture Considerations
- Uses Gmail Push Notifications (Cloud Pub/Sub) for real-time email watching
- Background worker on Railway processes incoming emails
- All email content processed by LLM stays server-side, never stored in raw form
- User must explicitly grant Gmail read permission (OAuth scope: gmail.readonly)
- Agent actions are always SUGGESTIONS — never auto-books without confirmation
- Future: Slack/Teams webhook integration for work chat monitoring

### Database additions
```sql
email_agent_events (
  id, user_id,
  source[gmail|slack|teams],
  source_message_id,
  classification,  -- booking_confirmation, schedule_change, meeting_invite, etc.
  extracted_data_json,  -- parsed travel details
  action_taken,  -- created_trip, updated_booking, suggested_search, ignored
  trip_id[nullable], booking_id[nullable],
  processed_at, created_at
)
```

---

## 4. Credit Card & Points Intelligence

### Card Profiles (Built-in)

#### Chase Sapphire Reserve ($795/yr)
- Portal: 1 cpp base, 1.5-2 cpp on "Points Boost" tagged bookings
- Legacy points before Oct 2025: 1.5 cpp through Oct 2027
- Transfer partners (all 1:1): United, Hyatt, Southwest, British Airways, Singapore, Air France/KLM, Aeroplan, Virgin Atlantic, JetBlue, IHG, Marriott, Wyndham + others
- Unique value: only card with Hyatt transfer (best hotel program)
- Earning: 8x Chase Travel, 4x direct flights/hotels

#### Amex Platinum ($895/yr)
- Portal: 1 cpp flights, 0.7 cpp hotels, 1 cpp FHR
- Transfer partners (1:1 unless noted): Delta, ANA, Cathay Pacific, Singapore, BA, Virgin Atlantic, Air France, Avianca LifeMiles, Qatar, Etihad, Qantas + others
- Emirates: 5:4 ratio (unfavorable)
- Most frequent transfer bonuses (20-40% to BA, VS, IB, AF/KLM)
- Unique value: only card with ANA + Delta transfers
- Earning: 5x direct flights + Amex Travel

#### Capital One Venture X ($395/yr)
- Portal: flat 1 cpp all bookings + $300 travel credit + 10K anniversary miles
- Transfer partners (1:1 unless noted): Turkish Airlines, TAP Portugal, BA, Singapore, Cathay, Air France, Avianca, Aeroplan + others
- Emirates: 2:1.5 ratio (unfavorable)
- Unique value: only card with Turkish Miles&Smiles (amazing for Star Alliance business)
- Earning: 10x hotels/cars via portal, 5x flights via portal, 2x everything else

### Points Optimization Engine
```
For a given itinerary:
1. Calculate cash price
2. For each card's portal: calculate points needed + cpp value
3. For each transfer partner:
   a. Check award availability
   b. Calculate points needed + transfer ratio
   c. Factor in current transfer bonuses
   d. Calculate effective cpp
4. Rank all options by cpp value
5. Recommend: "Transfer 60K Chase UR → Hyatt for 2.3 cpp vs 1.0 cpp cash via portal"
```

### TPG & Review Intelligence (New Requirement #8)
- Background job scrapes The Points Guy, One Mile at a Time, Upgraded Points weekly
- Gemini Pro + Google Search Grounding fetches latest deals, reviews, sweet spots
- Stores extracted tips in database: route sweet spots, transfer bonus alerts, card offer changes
- LLM incorporates tips when making recommendations
- Users can browse a "Deals & Tips" feed

---

## 5. Natural Language Interface (Requirement #9)

### Conversational Flow (replaces traditional form filling)
```
User: "I need to fly from SF to London for a meeting March 15, coming back the 20th.
       Business class, ideally direct. Can I use points?"

App: Here's what I found for SFO → LHR, Mar 15-20, Business:

     ✈ Best Cash Deal
     United Polaris (direct) — $3,200 RT
     Departs 7:45pm, arrives 1:30pm+1

     ✈ Best Points Deal
     Transfer 70K Virgin Atlantic → ANA (your Amex MR)
     Current 30% transfer bonus = only 54K Amex MR needed
     That's 5.9 cpp — exceptional value

     ✈ Alternative
     British Airways via LHR (1 stop) — 68K Avios (Chase UR 1:1)
     $2,100 + 68K points = good hybrid option

     Want me to hold the United fare while you decide?

User: "The Virgin Atlantic deal sounds great but can you check if there's
       availability on the Wednesday instead?"

App: Checking ANA award space for Mar 16...
     [searches]
     Yes! 2 seats available on NH7 SFO→NRT→LHR on Mar 16.
     Same 54K Amex MR with the bonus. Want me to prepare the booking?
```

### Implementation
- Chat interface as the primary interaction mode
- Traditional search form available as fallback ("Advanced Search")
- Voice input support (Web Speech API)
- Conversation history stored per user
- LLM maintains context across multi-turn planning sessions

---

## 6. Multi-User & Organization System

### Structure
```
Platform
├── Organization: "Yan Family" (type: family)
│   ├── Owner: Robin (full access)
│   ├── Member: [Family Member 2] — book, view shared trips
│   ├── Member: [Family Member 3] — book, view shared trips
│   └── Member: [Family Member 4] — book, view shared trips
│
├── Organization: "Robin's Company" (type: business)
│   ├── Admin: Robin (full access + policy management)
│   ├── Member: Colleague 1 — book within policy
│   ├── Member: Colleague 2 — book within policy
│   ├── Member: Colleague 3 — book within policy
│   └── Member: Colleague 4 — book within policy
│
└── Organization: [Future Org] (expandable)
    └── ...
```

### Roles & Permissions
| Role | Can Book | See Others' Trips | Manage Members | Manage Cards | Set Policy |
|---|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ (org cards) | ✓ |
| Member | ✓ (self) | Shared only | ✗ | ✗ | ✗ |
| Viewer | ✗ | Shared only | ✗ | ✗ | ✗ |

### Auth
- Google OAuth (primary)
- Email magic links (fallback)
- Invite system: owner sends email invite → recipient signs in → auto-joins org
- A user can belong to multiple organizations

---

## 7. Integrations

### Google Calendar + Apple Calendar (iCal)
- Google Calendar: OAuth connection per user, auto-create/update events
- Apple Calendar: Generate .ics files with full VCALENDAR support
  - One-click "Add to Apple Calendar" from any itinerary
  - Subscribe-able .ics feed URL per trip (auto-updates)
- Events include: flight times, hotel check-in/out, car rental, meetings, restaurants
- Event details: confirmation numbers, terminal info, lounge locations, addresses, contact numbers
- Auto-update events when itinerary changes

### Flighty
- Deep link: `flighty://add?flight=UA123&date=2027-03-15`
- Auto-generate Flighty links for each flight segment
- One-click add from itinerary view

### Email Integration (Gmail API)
- Parse confirmation emails to auto-import bookings
- Send itinerary summaries to all passengers on a trip
- Forward boarding passes and gate changes

### Apple Wallet
- Generate .pkpass files for flight boarding passes
- Include barcode, gate, seat, and terminal info

### Google Maps Integration (Future Phase)
- Interactive map view of entire trip
- All segments pinned: airports, hotels, restaurants, meeting locations
- Directions between points
- Embedded in itinerary detail page
- Uses Google Maps JavaScript API + Places API

### Full Itinerary Builder & PDF Export
The itinerary is the centerpiece of the app — a complete, day-by-day view of a trip.

```
Trip: "Tokyo Business Trip" (Mar 15-20)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Saturday, March 15
  ✈ 7:45pm  SFO → NRT  United UA837 (Business / Polaris)
             Seat 6A · Terminal 3 · United Club lounge
             PNR: ABC123 · [Add to Flighty] [Add to Calendar]

📅 Sunday, March 16
  ✈ 10:30pm  Arrive NRT Terminal 1
  🚗 Pickup: Hertz — NRT Airport
  🏨 Check-in: Park Hyatt Tokyo (3 nights)
             Conf: HY-789456 · Globalist upgrade eligible
             47F Shinjuku, contact: +81-3-5322-1234

📅 Monday, March 17
  📍 9:00am  Meeting — WeWork Roppongi
             6-10-1 Roppongi, Minato-ku
  🍽 12:30pm  Lunch — Sukiyabashi Jiro (Roppongi)
  📍 2:00pm  Meeting — Client Office
             1-1-1 Marunouchi, Chiyoda-ku
  🍽 7:00pm  Dinner — Narisawa
             2-6-15 Minami-Aoyama · Reservation for 4

📅 Tuesday, March 18
  ... (free day / more meetings)

📅 Wednesday, March 19
  🏨 Check-out: Park Hyatt Tokyo
  🚗 Return: Hertz — NRT Airport
  ✈ 5:15pm  NRT → SFO  ANA NH8 (Business / The Room)
             Booked with 54K Amex MR via Virgin Atlantic

[📄 Export PDF]  [📅 Add All to Calendar]  [🗺 View on Map]
```

**PDF Export:**
- Professional, printable itinerary with all details
- Generated server-side via Puppeteer or @react-pdf/renderer
- Includes: QR codes for bookings, maps snippets, contact numbers
- Branded with trip title and traveler names
- One-click download from itinerary page

### User History & Learning
- Every completed trip feeds back into `user_travel_history`
- Users can rate flights, hotels, restaurants (1-5 + liked/disliked)
- LLM uses history when making recommendations:
  - "You flew United Polaris SFO→NRT last time and rated it 5/5 — same flight available"
  - "You stayed at Park Hyatt Tokyo twice — want to book again or try something new?"
  - "You prefer window seats on long-haul flights"
- History is per-user but can surface org patterns for business travel

---

## 8. Security Architecture

### Encryption Strategy
```
Sensitive Data Classification:
├── HIGH: Credit card last-4, FF numbers, passport info
│   └── AES-256-GCM encryption at rest
│   └── Encryption key: Vercel env var (rotatable)
│   └── Never logged, never in URL params
│
├── MEDIUM: PNR/confirmation codes, booking details
│   └── AES-256-GCM encryption at rest
│   └── Visible only to booking owner + org admins
│
└── LOW: Preferences, search history, conversation logs
    └── Standard database storage
    └── Access controlled by RBAC
```

### Credit Card Handling (Display-Only Model)
- Store: nickname, card type (Visa/Amex), last 4 digits, which portal it belongs to
- Do NOT store: full card number, CVV, expiration
- At booking time: user manually enters payment details on airline/portal site
- We prepare everything up to the payment step

### Additional Security
- All API routes: auth middleware + RBAC check
- Rate limiting: per-user, per-IP
- CSRF protection on all mutations
- Input validation: Zod schemas on every endpoint
- Audit log: every sensitive action (who, what, when, IP)
- Session: HTTP-only secure cookies, 24h expiry
- CSP headers, HSTS, X-Frame-Options
- Dependabot + npm audit in CI

---

## 9. Database Schema (Neon Postgres)

### Core Tables
```sql
-- ============================================
-- AUTH & USERS
-- ============================================
users (id, email, name, image, google_id, created_at, updated_at)
accounts (id, user_id, provider, provider_account_id, ...)  -- Auth.js managed
sessions (id, user_id, session_token, expires)

-- ============================================
-- ORGANIZATIONS (scalable: family, business, future white-label)
-- ============================================
organizations (id, name, type[family|business], owner_id, settings_json, created_at)
org_memberships (id, user_id, org_id, role[owner|admin|member|viewer], joined_at)
org_invites (id, org_id, email, role, token, expires_at, accepted_at)

-- ============================================
-- USER PROFILES & TRAVEL DOCUMENTS
-- ============================================
user_profiles (
  id, user_id,
  -- Preferences
  seat_pref, meal_pref, cabin_class_pref,
  -- Travel documents (encrypted)
  passport_number_enc, passport_expiry, passport_country,
  tsa_precheck_number_enc, global_entry_number_enc, known_traveler_id_enc,
  -- Contact
  phone, emergency_contact_name, emergency_contact_phone,
  -- Future: visa/arrival card auto-fill
  date_of_birth_enc, nationality, place_of_birth,
  address_json_enc,  -- structured address for form auto-fill
  employer_name, employer_address  -- for visa applications
)

-- ============================================
-- LOYALTY PROGRAMS
-- ============================================
ff_programs (id, user_id, airline_code, program_name, member_number_enc, status_level, priority_phone, priority_email, notes)
hotel_programs (id, user_id, hotel_chain, program_name, member_number_enc, status_level, priority_phone, notes)

-- ============================================
-- CREDIT CARDS (display-only, no full numbers)
-- ============================================
credit_cards (id, user_id, org_id[nullable], nickname, card_type, last_four, issuer, portal[chase|amex|capital_one|none], earn_rates_json, is_org_card)

-- ============================================
-- POINT BALANCES
-- ============================================
point_balances (id, user_id, program[chase_ur|amex_mr|cap1|airline|hotel], program_name, balance, last_updated)

-- ============================================
-- TRIPS (top-level container for full itineraries)
-- ============================================
trips (
  id, user_id, org_id,
  title,  -- "Tokyo Business Trip" or "Family Hawaii Vacation"
  destination_city, destination_country,
  start_date, end_date,
  status[planning|booked|in_progress|completed|cancelled],
  travelers_json,  -- [{user_id, name, role}] - who is on this trip
  notes,
  created_from_conversation_id,  -- links back to the chat that created it
  created_at, updated_at
)

-- ============================================
-- BOOKINGS (individual reservations within a trip)
-- ============================================
bookings (
  id, trip_id, user_id, org_id,
  type[flight|hotel|car|restaurant|activity|meeting|transfer],  -- extensible
  status[draft|pending|confirmed|completed|cancelled],
  pnr_enc, confirmation_number_enc,
  total_cost, currency, payment_method_id, points_used, points_program,
  vendor_name, vendor_contact,
  check_in_at, check_out_at,  -- for hotels
  details_json,  -- flexible per-type details
  created_at, updated_at
)

-- ============================================
-- ITINERARY SEGMENTS (ordered items within a booking or trip)
-- ============================================
itinerary_segments (
  id, booking_id, trip_id,
  type[flight|hotel_night|car_pickup|car_return|restaurant|meeting|activity|transfer|note],
  sort_order,  -- for manual reordering
  -- Common fields
  title, description,
  start_at, end_at,
  -- Location (for map integration)
  location_name, location_address,
  location_lat, location_lng,
  location_google_place_id,  -- for Google Maps deep link
  -- Flight-specific
  carrier, flight_number, origin, destination,
  cabin_class, seat, terminal, gate,
  -- Confirmation
  confirmation_enc,
  details_json,  -- overflow for type-specific data
  created_at
)

-- ============================================
-- USER PREFERENCES & HISTORY (for learning/recommendations)
-- ============================================
user_preferences (
  id, user_id,
  -- Favorite airlines/hotels/routes
  preferred_airlines_json,  -- ["UA", "NH", "SQ"]
  preferred_hotels_json,    -- ["hyatt", "marriott"]
  preferred_airports_json,  -- ["SFO", "OAK"]
  home_airport,
  -- Defaults
  default_cabin_class, default_optimization_mode,
  -- Dietary / accessibility
  dietary_restrictions, accessibility_needs,
  updated_at
)

user_travel_history (
  id, user_id, trip_id, booking_id,
  type[flight|hotel|restaurant|car],
  -- What was used
  vendor, route_or_location,  -- "SFO→NRT" or "Park Hyatt Tokyo"
  cabin_class, room_type,
  -- User feedback
  rating[1-5], liked[bool], notes,
  -- For ML/LLM recommendations
  traveled_at, created_at
)

-- ============================================
-- SEARCH & CONVERSATIONS
-- ============================================
conversations (
  id, user_id, trip_id[nullable],
  title, model_used,
  created_at, updated_at
)
messages (
  id, conversation_id,
  role[user|assistant|system|tool],
  content, model_used, tokens_used,
  tool_calls_json,  -- if the LLM invoked tools
  created_at
)

-- ============================================
-- TRAVEL INTELLIGENCE
-- ============================================
travel_tips (id, source[tpg|omaat|upgraded_points|gemini], category, title, summary, url, route_applicable, extracted_at, expires_at)
transfer_partners (id, card_program, airline_program, ratio_from, ratio_to, is_active)
transfer_bonuses (id, card_program, partner, bonus_pct, start_date, end_date, source_url)

-- ============================================
-- SMART PRICING & FARE RULES
-- ============================================
booking_fare_rules (
  id, booking_id,
  fare_class, fare_brand,  -- "Y" class, "Basic Economy" brand
  change_fee, change_fee_currency,
  cancel_policy[full_refund|credit|partial|none],
  same_day_change[bool],
  upgrade_eligible[bool],
  refundable[bool],
  flexibility_score,  -- 0-100 computed score
  rules_raw_json,     -- full fare rules for reference
  created_at
)

price_watches (
  id, booking_id, user_id,
  origin, destination, travel_date, cabin_class,
  original_price, current_best_price,
  savings_available,
  last_checked, alert_sent_at,
  is_active,
  created_at
)

airline_credits (
  id, user_id,
  airline, credit_amount, currency,
  credit_code_enc,  -- encrypted credit/voucher code
  issued_date, expiry_date,
  used_amount,
  status[active|partially_used|used|expired],
  booking_id_source,  -- which cancelled booking generated this
  notes,
  created_at
)

-- ============================================
-- EVENT-AWARE PRICING
-- ============================================
global_events (
  id, name,
  type[conference|sports|holiday|festival|political|weather],
  city, country,
  start_date, end_date,
  expected_price_impact[low|medium|high],
  description, source_url,
  created_at
)

route_price_history (
  id, origin, destination, cabin_class,
  price, currency, airline,
  data_source[amadeus|serpapi|manual],
  searched_at
)

disruption_alerts (
  id, type[strike|weather|airspace|cancellation|schedule_change],
  airlines_affected_json,  -- ["LH", "LX", "OS"]
  routes_affected_json,    -- ["FRA-*", "MUC-*"]
  start_date, end_date,
  severity[low|medium|high|critical],
  description, source_url,
  created_at, expires_at
)

-- ============================================
-- PRICE ALERTS
-- ============================================
price_alerts (id, user_id, origin, destination, date_range_start, date_range_end, cabin_class, target_price, current_best, is_active, last_checked)

-- ============================================
-- INTEGRATIONS
-- ============================================
calendar_events (
  id, user_id, booking_id, segment_id,
  provider[google|apple],  -- support both Google and Apple Calendar
  external_event_id,
  synced_at
)
email_imports (id, user_id, gmail_message_id, booking_id, parsed_at)

-- ============================================
-- TRAVEL REQUIREMENTS (visa, health, transit)
-- ============================================
travel_requirements_cache (
  id, passport_country, destination_country,
  visa_required[bool], visa_type, visa_url,
  passport_validity_months,  -- e.g. 6 = must have 6mo validity
  transit_visa_notes,
  vaccination_requirements_json,
  travel_advisory_level,     -- 1-4 (State Dept scale)
  last_updated, source
)

-- ============================================
-- EXPENSES & RECEIPTS
-- ============================================
trip_expenses (
  id, trip_id, booking_id[nullable], user_id,
  category[flight|hotel|car|meal|transport|other],
  description, amount, currency, amount_home_currency,
  exchange_rate, expense_date,
  payment_card_id[nullable],
  is_business[bool],
  receipt_url_enc,  -- encrypted S3/R2 path to receipt image
  created_at
)

-- ============================================
-- NOTIFICATIONS
-- ============================================
notification_preferences (
  id, user_id,
  channel[in_app|email],
  flight_status[bool], check_in_reminders[bool],
  price_drops[bool], transfer_bonuses[bool],
  credit_expiry[bool], passport_expiry[bool],
  pre_trip_summary[bool],
  created_at, updated_at
)

notifications (
  id, user_id,
  type, title, body, action_url,
  related_trip_id, related_booking_id,
  read_at, created_at
)

-- ============================================
-- TRIP TEMPLATES & SHARING
-- ============================================
trip_templates (
  id, user_id, org_id,
  title, description,
  template_data_json,  -- segments, preferences, defaults
  use_count, created_at
)

trip_shares (
  id, trip_id, share_token,  -- random URL-safe token
  permissions[view|collaborate],
  expires_at, created_at
)

-- ============================================
-- TRAVEL DOCUMENTS (future: visa, arrival cards)
-- ============================================
travel_documents (
  id, user_id, trip_id,
  type[visa|arrival_card|eta|passport_copy|insurance|vaccination],
  country, status[not_started|in_progress|submitted|approved|denied],
  document_data_json_enc,  -- encrypted form field data
  expiry_date, notes,
  created_at, updated_at
)

-- ============================================
-- NEARBY AIRPORTS & CREATIVE ROUTING
-- ============================================
nearby_airports (
  id, airport_code, nearby_code,
  distance_miles, same_metro_area,
  ground_transport_options_json,
  created_at
)

-- ============================================
-- EMAIL AGENT
-- ============================================
email_agent_events (
  id, user_id,
  source[gmail|slack|teams],
  source_message_id,
  classification,
  extracted_data_json,
  action_taken,
  trip_id[nullable], booking_id[nullable],
  processed_at, created_at
)

-- ============================================
-- TRAVEL SPEND ANALYTICS (materialized from bookings + expenses)
-- ============================================
travel_analytics_snapshots (
  id, user_id, org_id[nullable],
  period_start, period_end,
  total_spend, spend_by_category_json,
  total_points_earned, total_points_redeemed,
  avg_cpp_achieved,
  total_savings,  -- from POS arbitrage, smart pricing, rebookings
  carbon_kg_estimate,
  top_routes_json, top_airlines_json, top_hotels_json,
  created_at
)

-- ============================================
-- AUDIT LOG
-- ============================================
audit_log (id, user_id, action, resource_type, resource_id, details_json, ip_address, created_at)
```

---

## 10. Project Structure

```
travel-agent-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth pages (login, register)
│   │   ├── (dashboard)/              # Authenticated pages
│   │   │   ├── page.tsx              # Dashboard home — upcoming trips + chat
│   │   │   ├── chat/                 # Primary NL chat interface
│   │   │   ├── trips/                # Trip list + detail + itinerary builder
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Full itinerary view
│   │   │   │       ├── map/          # Google Maps trip view (future)
│   │   │   │       └── pdf/          # PDF export endpoint
│   │   │   ├── search/               # Advanced search form (fallback)
│   │   │   ├── bookings/             # Booking management
│   │   │   ├── points/               # Points & loyalty dashboard
│   │   │   ├── cards/                # Credit card management
│   │   │   ├── contacts/             # Priority contacts
│   │   │   ├── history/              # Travel history + ratings
│   │   │   ├── tips/                 # Travel tips feed
│   │   │   ├── settings/             # User + org + model settings
│   │   │   └── admin/                # Org admin panel
│   │   ├── api/                      # API routes
│   │   │   ├── auth/                 # Auth.js routes
│   │   │   ├── flights/              # Flight search endpoints
│   │   │   ├── bookings/             # Booking CRUD
│   │   │   ├── trips/                # Trip + itinerary CRUD
│   │   │   ├── chat/                 # LLM conversation endpoint (streaming)
│   │   │   ├── points/               # Points optimization
│   │   │   ├── calendar/             # iCal feed + Google Calendar sync
│   │   │   ├── pdf/                  # PDF itinerary generation
│   │   │   ├── webhooks/             # External webhooks
│   │   │   └── cron/                 # Vercel cron endpoints
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn components
│   │   ├── chat/                     # Chat interface (primary UI)
│   │   ├── trips/                    # Trip cards, itinerary timeline
│   │   ├── flights/                  # Flight result cards
│   │   ├── bookings/                 # Booking management UI
│   │   └── dashboard/                # Dashboard widgets
│   ├── lib/
│   │   ├── ai/                       # Multi-model LLM layer
│   │   │   ├── router.ts             # Model router (intent → model)
│   │   │   ├── providers/
│   │   │   │   ├── anthropic.ts      # Claude integration
│   │   │   │   ├── google.ts         # Gemini integration
│   │   │   │   └── openai.ts         # OpenAI integration
│   │   │   ├── prompts/              # System prompts per task
│   │   │   └── tools/                # LLM tool definitions (search, book, etc.)
│   │   ├── flights/                  # Flight search abstraction
│   │   │   ├── amadeus.ts
│   │   │   ├── serpapi.ts
│   │   │   ├── duffel.ts
│   │   │   └── aggregator.ts         # Combines + deduplicates
│   │   ├── points/                   # Points optimization logic
│   │   │   ├── transfer-partners.ts  # Partner database
│   │   │   ├── valuations.ts         # CPP calculations
│   │   │   └── optimizer.ts          # Recommendation engine
│   │   ├── itinerary/                # Itinerary builder + PDF generation
│   │   │   ├── builder.ts            # Compose trip from bookings
│   │   │   ├── pdf.ts                # PDF renderer (@react-pdf/renderer)
│   │   │   └── ical.ts               # iCal/ICS generation
│   │   ├── travel-reqs/              # Visa, passport, health requirements
│   │   ├── notifications/            # Alert engine + delivery (in-app, email)
│   │   ├── expenses/                 # Expense tracking, currency conversion
│   │   ├── crypto/                   # Encryption utilities
│   │   ├── db/                       # Drizzle schema + queries
│   │   │   ├── schema/               # Schema files per domain
│   │   │   └── queries/              # Prepared query functions
│   │   ├── auth/                     # Auth.js config
│   │   └── integrations/             # Calendar, Flighty, email, maps, FlightAware
│   ├── hooks/                        # React hooks
│   └── types/                        # Shared TypeScript types
├── drizzle/                          # Database migrations
├── public/
├── .env.local                        # Local env vars (not committed)
├── .env.example                      # Template for env vars
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 11. Build Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Project scaffolding: Next.js 15 + TypeScript + Tailwind + shadcn
- [ ] Auth.js with Google OAuth + email magic links
- [ ] Neon database setup + Drizzle schema + initial migration (full schema including future tables)
- [ ] Multi-org system: create/join orgs, invite members, RBAC
- [ ] Encrypted field utilities (AES-256-GCM)
- [ ] Basic dashboard shell with navigation
- [ ] User profile + travel documents + preferences CRUD
- [ ] FF program + hotel program CRUD
- [ ] Credit card management (display-only)
- [ ] Deploy to Vercel + connect Neon
- [ ] CI/CD via GitHub Actions
- [ ] Walk through Amadeus Self-Service API signup

### Phase 2 — Chat & LLM Engine (Week 3-4)
- [ ] Multi-model provider abstraction (Claude, Gemini, OpenAI)
- [ ] Model router: intent classification via Haiku 4.5
- [ ] Chat interface as primary UI (streaming responses)
- [ ] Natural language → structured search/action parameters
- [ ] Conversation persistence (per user, linked to trips)
- [ ] Model selector in settings (default: Sonnet 4.6, badge per response)
- [ ] Traditional search form (advanced mode fallback)

### Phase 3 — Flight Search & Hotels (Week 5-6)
- [ ] Amadeus API integration (flight offers search)
- [ ] SerpAPI Google Flights integration (cross-reference)
- [ ] Hotel search (Amadeus Hotel Search API)
- [ ] Multi-market POS search: parallel queries across origin, destination, and known cheap markets
- [ ] POS arbitrage: side-by-side market pricing, FX conversion, FTF flag per card
- [ ] Nearby airport search: auto-expand to alternate airports within radius
- [ ] Positioning flight combo evaluation (cheap alternate origin + positioning leg)
- [ ] Open-jaw and one-way combo pricing comparison
- [ ] Flight + hotel results normalization + deduplication (across markets + airports)
- [ ] Gemini Flash for structured data extraction
- [ ] Fare class + fare rules parsing (refundable, changeable, upgrade-eligible)
- [ ] Flexibility scoring (0-100) per flight option
- [ ] Baggage allowance display per fare class + FF status
- [ ] LLM-powered ranking (value, schedule, stops, points, flexibility, cheapest market modes)
- [ ] POS market intelligence table: learn which markets are cheapest per route over time

### Phase 4 — Smart Pricing & Upgrade Engine (Week 7-8)
- [ ] Economy + upgrade strategy analysis per flight
- [ ] Calculate: base fare + upgrade cost vs. direct premium purchase
- [ ] Fare class upgrade eligibility detection
- [ ] Mileage earning comparison across fare classes
- [ ] "Best path to business class" recommendation alongside standard results
- [ ] Bid-for-upgrade detection (United, Lufthansa, etc.)

### Phase 5 — Trips & Itineraries (Week 9-10)
- [ ] Trip creation from chat ("plan my Tokyo trip")
- [ ] Itinerary builder: flights + hotels + meetings + restaurants + notes
- [ ] Day-by-day timeline view with all segments (timezone-aware, local times)
- [ ] Drag-and-drop reordering of segments
- [ ] Connection time validation (immigration, customs, terminal changes)
- [ ] Travel requirement checker: visa, passport validity, transit visa warnings
- [ ] PDF itinerary export (professional, printable, with QR codes)
- [ ] iCal (.ics) generation + Apple Calendar "Add All" button
- [ ] Shareable trip links (read-only, no account required)
- [ ] Trip templates (save & reuse for recurring travel)
- [ ] User travel history tracking + ratings

### Phase 6 — Points & Optimization (Week 11-12)
- [ ] Transfer partner database (all 3 cards + all partners)
- [ ] Points balance tracking per program
- [ ] CPP calculator across all redemption paths
- [ ] Transfer bonus tracking (auto-update via Gemini search)
- [ ] "Best way to pay" recommendation per booking (cash vs. points vs. upgrade path)
- [ ] Portal comparison guidance (Chase/Amex/C1)
- [ ] LLM uses history to personalize recommendations

### Phase 7 — Event Intelligence & Price Monitoring (Week 13-14)
- [ ] PredictHQ API integration for global events database
- [ ] Route price history tracking (from every search we run)
- [ ] Historical price comparison ("this route is 30% above average")
- [ ] Event-driven price spike warnings (conferences, sports, holidays)
- [ ] Disruption monitoring: strikes, weather, airspace closures
- [ ] Post-booking price watch: monitor booked flights for price drops
- [ ] Rebooking assistant: calculate savings after change fees, prepare swap
- [ ] Airline credit/voucher tracking with expiry reminders
- [ ] Mistake fare / flash sale detection

### Phase 8 — TPG Intelligence & Tips (Week 15)
- [ ] Background scraper: TPG, OMAAT, Upgraded Points
- [ ] Gemini Pro + Google Search for current deals/tips
- [ ] Tips feed UI with filtering by category
- [ ] LLM incorporates tips into recommendations
- [ ] Transfer bonus alerts (push notification ready)

### Phase 9 — Booking & Contacts (Week 16-17)
- [ ] Amadeus booking pipe (search → price → book flow, manual payment confirm)
- [ ] Agent-assisted booking for non-API airlines
- [ ] Priority contact directory per airline × status level
- [ ] PNR management (store, display, link to itinerary)
- [ ] Booking confirmation flow + fare rules storage

### Phase 10 — Integrations & Agent Layer (Week 18-19)
- [ ] Google Calendar OAuth + auto-create/update events
- [ ] Apple Calendar: subscribe-able .ics feed per trip
- [ ] Flighty deep link generation
- [ ] Gmail API: parse confirmation emails → auto-import bookings
- [ ] Email Agent: Gmail push notifications → classify → auto-import/suggest
- [ ] Proactive trip suggestions from meeting invites in different cities
- [ ] Duplicate booking detection across org members
- [ ] Email notifications to passengers
- [ ] Apple Wallet .pkpass generation
- [ ] Price alert system (Railway background jobs)

### Phase 11 — Notifications & Expense Tracking (Week 20)
- [ ] Notification system: in-app + email
- [ ] Pre-trip summary (48hrs before: flight status, weather, docs, lounge info)
- [ ] Check-in reminders (24hrs before departure)
- [ ] Gate change / delay alerts (FlightAware or OAG data feed)
- [ ] Credit/passport expiry warnings
- [ ] Notification preferences per user
- [ ] Expense tracking: auto-tally per trip, business/personal tagging
- [ ] Receipt photo upload (encrypted storage)
- [ ] Expense export: CSV + PDF for reimbursement
- [ ] Currency conversion at date-of-purchase rates

### Phase 12 — Polish, Analytics & Scale (Week 21-22)
- [ ] Audit log viewer for admins
- [ ] Usage + cost dashboard (API spend per model)
- [ ] Travel spend analytics dashboard (YoY spend, savings, CPP, carbon)
- [ ] Quick re-book: "Book again" button on completed trips
- [ ] Emergency assistance mode (contextual emergency contacts, airline priority lines)
- [ ] Currency & tipping guide per destination
- [ ] Seat selection intelligence (aircraft-specific maps + recommendations)
- [ ] PWA setup: service worker + offline itinerary caching
- [ ] Mobile-responsive optimization
- [ ] Performance: edge caching, lazy loading, optimistic UI
- [ ] Rate limiting + abuse prevention
- [ ] Load testing + documentation

### Future Phases (backlog)
- [ ] Google Maps trip visualization (all segments as pins on interactive map)
- [ ] Restaurant reservations (OpenTable / Resy API)
- [ ] Visa application auto-fill from stored travel documents
- [ ] Electronic arrival card auto-fill (uses passport + flight data)
- [ ] Car service / ground transport / train booking
- [ ] Multi-city trip optimizer (optimal city order to minimize cost/backtracking)
- [ ] Travel insurance comparison engine
- [ ] Lounge finder (by card + status at each airport)
- [ ] Destination briefing (weather, customs, tipping, embassy, eSIM, adapters)
- [ ] Multi-org white-label (custom branding per organization)
- [ ] Voice input for chat (Web Speech API)
- [ ] Collaborative trip planning (multiple users editing same trip via chat)
- [ ] Auto-generated packing lists (destination, weather, duration, activities)
- [ ] Slack / Teams integration for agent chat monitoring
- [ ] Group booking coordinator (multi-passenger, seat coordination, split payment)
- [ ] eSIM recommendations per destination
- [ ] Train/bus alternatives for short positioning legs (Eurostar, etc.)

---

## 12. External APIs & Costs

| Service | Free Tier | Paid Tier | Usage Estimate |
|---|---|---|---|
| Amadeus (Self-Service) | 100 calls/month | Pay-as-go | Primary flight data |
| SerpAPI | 100 searches/month | $50/mo (5K) | Google Flights backup |
| Anthropic (Claude) | — | ~$3-15/1M tokens | Primary LLM |
| Google AI (Gemini) | 500 req/day | ~$0.30-10/1M tokens | Search + extraction |
| OpenAI (GPT) | — | ~$2-8/1M tokens | Optional alternative |
| Tavily | 1K searches/month | $40/mo (5K) | Web research |
| Neon | Free tier (0.5GB) | $19/mo (10GB) | Database |
| Vercel | Hobby (free) | Pro $20/mo | Hosting |
| Railway | $5 trial credit | ~$5-20/mo | Background workers |
| PredictHQ | Free (1K events/mo) | $99/mo (10K) | Global events for pricing intelligence |
| Sentry | Free (5K events) | $26/mo | Error tracking |

**Estimated monthly cost at moderate usage: $200-400/mo**

---

## 13. Key Architectural Decisions

1. **Multi-model, not single-model** — route tasks to the best model for each job, no vendor lock-in
2. **Chat-first, forms-second** — natural language is the primary interface; forms are advanced fallback
3. **Trip-centric data model** — trips are the top-level container; bookings, segments, conversations all link to trips
4. **Display-only cards** — no PCI compliance burden, users enter payment manually
5. **Amadeus for data, LLM for intelligence** — never rely on LLM for flight pricing
6. **Org-scalable from day 1** — multi-tenant architecture supports future rollout to new orgs
7. **Encrypted by default** — all PII and financial data encrypted at rest
8. **Learn from history** — every completed trip feeds back into personalized recommendations
9. **Schema-first future-proofing** — tables for visa/documents, restaurants, locations designed now even if features come later
10. **Background intelligence** — continuously scrape deals/tips, don't wait for user queries
11. **Itinerary as the product** — the full, day-by-day itinerary (web + PDF + calendar) is the primary deliverable, not individual search results
12. **Smart pricing, not just price comparison** — evaluate hybrid strategies (economy + upgrade) not just fare vs. fare
13. **Event-aware** — global events, strikes, and disruptions are first-class pricing signals, not afterthoughts
14. **Flexibility as a feature** — fare refundability/changeability scored and displayed alongside price; post-booking monitoring enables rebooking when prices drop
15. **Global pricing** — same flight searched across multiple country markets; POS arbitrage is a first-class optimization mode
16. **Full travel lifecycle** — pre-trip (requirements, prep), during-trip (alerts, status), post-trip (expenses, ratings, history) — not just search and book
17. **Notification-driven** — proactive alerts (price drops, check-in, gate changes, expiring credits) keep users informed without requiring them to open the app
18. **Airport-agnostic** — every search auto-expands to nearby airports and evaluates positioning flights; users shouldn't be locked to one airport
19. **Agent-first communication** — email/chat monitoring agent proactively manages travel context; users shouldn't have to manually enter every trip
20. **Offline-capable** — PWA with service worker ensures itineraries are accessible anywhere, even without connectivity
21. **Analytics-driven improvement** — track savings, CPP achieved, and spending patterns to continuously demonstrate and improve value delivery

---

## 14. Amadeus API Setup Guide

To get started with Amadeus (we'll do this together in Phase 1):

1. **Sign up** at https://developers.amadeus.com — free account
2. **Create an app** in the dashboard → get `API Key` and `API Secret`
3. **Self-Service tier** (free): 100 calls/month for testing
   - Flight Offers Search (v2) — search flights
   - Flight Offers Price (v1) — confirm pricing
   - Flight Create Orders (v1) — book flights (Phase 7)
   - Hotel Search (v3) — search hotels
   - Airport & City Search (v1) — autocomplete
4. **Production tier**: Apply when ready for real traffic (pay-per-call)
5. **Test environment**: Uses test data, no real bookings — safe for development

I'll walk you through the signup and first API call when we start Phase 3.
