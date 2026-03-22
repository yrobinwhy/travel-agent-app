# TravelAgent Pro — Feature Overview

*Your AI-powered travel concierge for personal and business travel.*

---

## How It Works

TravelAgent Pro replaces the traditional click-through-forms booking experience with a **natural language chat interface**. Just tell it what you need in plain English:

> "I need to fly from San Francisco to Tokyo on March 15, returning the 20th. Business class, prefer direct flights. Book a hotel near Shibuya for 4 nights, and find a nice restaurant for a client dinner on Monday night."

The AI handles the rest — searching across airlines, comparing prices, optimizing your points, building your full itinerary, and learning your preferences over time.

---

## Core Features

### 1. Conversational Trip Planning

Talk to the app like you'd talk to a human travel agent. No forms, no dropdowns, no date pickers required.

- Describe your entire trip in one message or build it up over a conversation
- Ask follow-up questions: *"What if I leave a day earlier?"* or *"Can I use points instead?"*
- The AI remembers context within a conversation and across your travel history
- Advanced search form available if you prefer the traditional approach

### 2. Intelligent Flight Search

Searches across multiple sources simultaneously to find the best options for you.

- Compares prices across hundreds of airlines in real time
- Optimizes for what matters to you:
  - **Best Value** — business class quality per dollar (seat type, lounge access, service)
  - **Best Schedule** — minimize total travel time, match your preferred departure windows
  - **Fewest Stops** — prioritize direct flights
  - **Best Points Deal** — find the highest cents-per-point redemption across all your loyalty programs
  - **Creative Routing** — discover positioning flights, fifth-freedom routes, and hidden deals
- While you can set preferred airlines, the system searches all airlines to ensure you never miss a better deal

### 3. Hotel & Accommodation Search

- Search hotels alongside flights in the same conversation
- Factor in your loyalty status for potential upgrades and perks
- Compare cash prices vs. point redemptions
- Preferences learned over time (you stayed at Park Hyatt Tokyo twice and loved it — should we book again?)

### 4. Points & Loyalty Optimization

Maximize the value of every point across all your credit card and loyalty programs.

- **Transfer partner intelligence**: Knows every transfer partner and ratio for Chase Ultimate Rewards, Amex Membership Rewards, and Capital One Miles (and more programs can be added)
- **Real-time bonus tracking**: Monitors and alerts you to transfer bonus promotions (e.g., "30% bonus on Amex → Virgin Atlantic right now")
- **Cents-per-point analysis**: For every booking option, calculates the effective value of using points vs. cash
- **Portal comparison**: Compares booking through Chase Travel, Amex Travel, and Capital One Travel portals against direct booking and point transfers
- **Recommendation engine**: *"Transfer 54K Amex MR to Virgin Atlantic at 5.9 cents per point — that's exceptional value vs. paying $3,200 cash"*

### 5. Smart Pricing — Buy Cheap, Upgrade Smart

The app doesn't just compare ticket prices — it finds creative combinations that beat the obvious options.

- **Economy + upgrade strategy**: Automatically checks whether buying a cheaper fare class and upgrading with points, miles, or cash costs less than buying premium outright. For example: *"Economy on this flight is $800. An instant upgrade to business with 25K miles costs the equivalent of $500. Total: $1,300 vs. $3,200 for a business class ticket — saving you $1,900."*
- **Upgrade availability awareness**: Checks whether upgrade space is actually open before recommending this strategy, so you're not stuck in economy hoping for an upgrade that never materializes
- **Fare class analysis**: Identifies which economy fare classes are upgrade-eligible (not all are) and which give you the best upgrade priority based on your status
- **Mileage earning comparison**: Factors in that premium tickets often earn more miles — sometimes the direct business class purchase earns enough bonus miles to offset part of the price difference
- **Bid-for-upgrade tracking**: For airlines that offer pre-departure upgrade auctions (e.g., United, Lufthansa), flags when this option is available and estimates a winning bid

### 6. Event-Aware Pricing Intelligence

Travel prices don't exist in a vacuum. The app monitors real-world events that affect pricing and availability.

- **Price spike warnings**: Alerts you when flights on your route are likely to be inflated due to major events — conferences (CES, SXSW, Davos), sporting events (Olympics, World Cup, F1 races), holidays, and peak travel seasons. *"Flights to Las Vegas Jan 7-10 are 3x normal — CES is that week. Consider arriving Jan 6 or flying into a nearby airport."*
- **Disruption monitoring**: Tracks airline strikes, severe weather patterns, airspace closures, and geopolitical events that could cancel or reroute flights. *"Air France pilots have announced a strike Mar 18-20. Your Paris flight is at risk — here are backup options on other carriers."*
- **Price decline forecasting**: Identifies routes where prices are trending downward due to new airline competition, capacity increases, or post-event normalization. *"This route has dropped 22% in the last 2 weeks as the peak season ends — good time to book."*
- **Opportunistic alerts**: Flags mistake fares, flash sales, and unusual pricing drops when they appear on routes you've searched before or frequently fly
- **Historical pricing context**: Shows whether the current price is above, below, or at the typical level for this route and time of year, so you know if you're getting a deal or overpaying

### 7. Flexible Ticket Strategy

Not all fares are created equal. The app evaluates refundability and changeability as part of every recommendation.

- **Fare flexibility scoring**: Every flight option is tagged with a flexibility rating — fully refundable, changeable with fee, changeable for free, or non-refundable/locked. This is shown alongside price so you can weigh the tradeoff.
- **Post-booking price monitoring**: After you book, the app continues watching the price. If the fare drops significantly: *"Your SFO→LHR flight dropped $400 since you booked. Your ticket is changeable with a $0 fee — want me to rebook at the lower price? You'd save $400."*
- **Rebooking automation**: For eligible tickets, the app prepares the rebooking for you — calculates the savings after any change fees, confirms availability on the same flight, and walks you through the swap (or handles it via API where possible)
- **"Book now, upgrade later" strategy**: When flexible fares are only slightly more expensive, the AI recommends them as insurance: *"The flexible economy fare is $120 more but lets you change for free. Given that fares on this route tend to fluctuate, the flexibility is worth it."*
- **Credit and voucher tracking**: If you cancel a refundable ticket or receive airline credits, the app stores them and reminds you before they expire. *"You have a $350 United travel credit expiring in 45 days — want to use it for your next trip?"*
- **Fare class upgrade path**: Identifies when booking a slightly higher fare class unlocks free changes, seat selection, or lounge access that the cheapest fare doesn't include — sometimes spending $50 more saves you $200 in change fees later

### 8. Global Pricing Search (Point of Sale Arbitrage)

Airlines price the same flight differently depending on which country you're booking from. A New York to Delhi flight might cost $2,400 when booked from the US market but $1,600 when booked from the Indian market — same seat, same flight, different price. TravelAgent Pro automatically finds the cheapest market for every flight.

- **Multi-market pricing scan**: For every flight search, the app queries pricing from multiple country markets simultaneously — the origin country, the destination country, and known markets that tend to offer lower fares for that route
- **Side-by-side comparison**: See the same flight priced from different markets. *"United 83 JFK→DEL: $2,400 (US market), $1,650 (India market), $1,890 (UK market). Saving: $750 by booking through India."*
- **Currency advantage detection**: Identifies when exchange rates make a foreign-currency fare cheaper than the home-market fare, even after conversion and any foreign transaction fees
- **Booking guidance**: When a foreign market price wins, the app tells you exactly how to book it — which regional airline site or OTA to use, what currency to pay in, and whether your credit card charges foreign transaction fees (your Chase Sapphire Reserve and Capital One Venture X don't; the Amex Platinum doesn't either)
- **Fare rule consistency check**: Verifies that the cheaper foreign-market fare has the same baggage, change, and cancellation policies — some markets sell different fare rules for the same flight
- **Route-specific market intelligence**: Over time, the system learns which markets consistently offer the best pricing for specific routes and prioritizes those in future searches. For example, it learns that South Asia routes are often cheapest from the Indian market, and intra-European flights are often cheapest from Scandinavian markets.

### 9. Multiple Frequent Flyer & Hotel Programs

- Store all your airline frequent flyer numbers and hotel loyalty program numbers
- Track your status level at each program (Gold, Platinum, 1K, Globalist, etc.)
- Status-aware recommendations: factors in your elite benefits like complimentary upgrades, lounge access, and priority boarding
- Priority contact directory: when you need to make changes, instantly access the right phone number for your status level (e.g., United 1K desk, Hyatt Globalist line)

### 10. Credit Card Management

- Store your travel credit cards (card type and last 4 digits — we never store full card numbers)
- Track which portal each card belongs to and its earning rates
- Get recommendations on which card to use for each booking to maximize rewards
- Support for both personal and shared organization cards

### 11. Full Itinerary Builder

Every trip gets a complete, day-by-day itinerary that keeps everything in one place.

- Flights, hotels, car rentals, restaurants, meetings, activities — all on one timeline
- Confirmation numbers, terminal info, addresses, and contact details for every segment
- Drag-and-drop reordering to adjust your schedule
- Add custom notes and free-form events
- Location data for every segment (addresses, coordinates) for future map integration

### 12. PDF Itinerary Export

Generate a professional, printable itinerary document for any trip.

- Clean, branded layout with day-by-day breakdown
- Includes QR codes for quick access to bookings
- All confirmation numbers, addresses, and emergency contacts
- Share with travel companions, assistants, or print for offline reference

### 13. Calendar Integration

Keep your calendar automatically in sync with your travel plans.

- **Google Calendar**: Connect your account and all trip events are created and updated automatically
- **Apple Calendar**: One-click "Add All to Calendar" generates an .ics file, or subscribe to a live-updating calendar feed for each trip
- Events include full details: flight numbers, confirmation codes, terminal info, hotel addresses, restaurant reservations

### 14. Travel Intelligence Feed

Stay informed with curated tips and deals from top travel sources.

- Automatically scans The Points Guy, One Mile at a Time, Upgraded Points, and other expert sources
- Surfaces relevant deals based on your home airport and preferred destinations
- Transfer bonus alerts so you never miss a promotional window
- The AI incorporates these tips into its recommendations — if there's a sweet spot route or a limited-time deal, it will tell you

### 15. Personalized Recommendations

The more you use it, the smarter it gets.

- Rate your flights, hotels, and restaurants after each trip
- The AI learns your preferences: favorite airlines, preferred seat types, go-to hotels, dietary preferences
- Recommendations reference your history: *"You rated United Polaris 5/5 last time on this route — same flight available"*
- Surfaces patterns: *"You usually prefer window seats on flights over 8 hours"*

### 16. Email Integration

Connect your Gmail to automatically capture bookings.

- Parses confirmation emails from airlines, hotels, and car rental companies
- Auto-imports bookings into your trips — no manual data entry
- Send itinerary summaries to all travelers on a trip
- Forward boarding passes and gate change notifications

### 17. Flighty Integration

For those who use Flighty to track flights in real time:

- One-click "Add to Flighty" button on every flight segment
- Deep links directly into the Flighty app

### 18. Apple Wallet

- Generate boarding pass files (.pkpass) for your flights
- Includes barcode, gate, seat, and terminal information
- Add directly to Apple Wallet from the itinerary view

### 19. Travel Requirement Checker

Before you book, the app checks what you need to actually get there — so there are no surprises at the airport.

- **Visa & entry requirements**: Based on your passport nationality and destination, tells you whether you need a visa, an eTA, an ESTA, or nothing. *"US passport holders need a tourist visa for India. You can apply for an e-Visa online — takes 3-5 business days."*
- **Transit visa warnings**: If your routing passes through a country that requires a transit visa, the app flags it before you book. *"Your connection in Beijing requires a transit visa for stays over 24 hours. Consider routing through Tokyo instead."*
- **Passport validity check**: Many countries require 6 months of passport validity beyond your travel dates. The app checks your stored passport expiry and warns you. *"Your passport expires in 4 months — Japan requires 6 months validity. Renew before booking."*
- **Vaccination & health requirements**: Flags countries that require proof of vaccination (e.g., yellow fever for certain African/South American destinations)
- **COVID/health entry requirements**: Monitors any active health-related entry requirements that may still apply for certain destinations
- **Travel advisory awareness**: Checks government travel advisories (State Department, FCO) and surfaces relevant warnings

### 20. Seat Selection Intelligence

- **Seat map data**: Where available, shows seat maps with the actual seat configuration for your specific aircraft type — not a generic layout
- **Seat recommendations**: Based on your preferences (window, aisle, extra legroom, near exit, avoid middle) and the specific aircraft, recommends the best available seats. *"Row 6 on this 777-300ER has a 1-2-1 layout in business. Seat 6A is a window with direct aisle access — your usual preference."*
- **SeatGuru-style intelligence**: Flags seats with known issues (limited recline, near galley/lavatory, misaligned windows) and highlights hidden gems (extra storage, power outlets, bassinet-free zones)
- **Seat selection timing**: Advises when to select seats — some airlines release better seats closer to departure, especially for elites

### 21. Timezone & Jet Lag Awareness

- **Timezone-smart itinerary**: All times shown in local time for each location, with clear timezone labels. No confusion about "does this 10am meeting mean Tokyo time or SF time?"
- **Arrival day buffer**: When planning trips that cross many timezones, the AI suggests arrival buffers. *"You're crossing 16 timezones. Consider arriving a day early before your Monday morning meeting."*
- **Connection time validation**: Flags tight connections that may not be realistic after factoring in immigration, customs, terminal changes, and rebooking risk
- **Travel time awareness**: When the AI plans your itinerary, it accounts for actual travel time between locations — not just flight time, but getting to/from airports, check-in, security, transit

### 22. Trip Sharing & Collaboration

- **Shareable trip links**: Generate a read-only link to any itinerary that anyone can view — no account required. Perfect for sharing with drivers, assistants, or people meeting you at your destination
- **Collaborative trip planning**: Multiple org members can contribute to the same trip via the chat. *"@Sarah added a restaurant reservation for Tuesday night"*
- **Trip templates**: Save a trip structure as a template for recurring travel. If you do the same SFO→NRT business trip quarterly, one click creates the framework and the AI fills in current pricing
- **Traveler packing lists**: Auto-generated suggested packing checklist based on destination, weather forecast, trip duration, and activities planned

### 23. Expense Tracking & Reporting

For business travelers, tracking spend is critical.

- **Automatic cost tracking**: Every booking in a trip is tallied automatically — flights, hotels, cars, meals
- **Per-trip expense summary**: See total spend per trip, broken down by category and payment method
- **Business vs. personal tagging**: Tag each expense as business or personal for clean separation
- **Export for reimbursement**: Export trip expenses as CSV or PDF for submitting to your company's expense system
- **Receipt storage**: Attach photos of receipts to individual bookings (stored encrypted)
- **Currency conversion**: All foreign-currency expenses shown in both original currency and your home currency at the exchange rate on the date of purchase

### 24. Notifications & Smart Alerts

Stay informed without being overwhelmed.

- **Pre-trip checklist**: 48 hours before departure, receive a summary: flight status, check-in reminders, weather at destination, any docs needed, lounge locations at your terminal
- **Gate changes & delays**: Real-time flight status updates pushed to your itinerary (via FlightAware or similar data feeds)
- **Check-in reminders**: Notified when online check-in opens (typically 24 hours before departure)
- **Credit expiry warnings**: Reminded 30 and 7 days before airline credits expire
- **Price drop alerts**: Notified when a watched route or your booked flight drops in price
- **Transfer bonus alerts**: Notified when a transfer bonus appears for a program you use
- **Passport & document expiry**: Reminded 6 months before passport expiry, with time to renew
- **Notification preferences**: Full control over what notifications you receive and through which channel (in-app, email, or both)

---

## Multi-User & Organization Support

### For Families

- Shared family account where each member logs in with their own email
- Everyone sees shared trip itineraries
- Each member has their own frequent flyer numbers, preferences, and travel documents
- Book trips for the whole family from one conversation

### For Business

- Create an organization for your team with role-based access
- **Owner / Admin**: Full access, manage members, set travel policies, view all bookings
- **Member**: Book travel for themselves, view shared itineraries
- **Viewer**: View-only access to shared trips
- Organization-level credit cards available to authorized members
- Invite colleagues via email — they sign in with Google or a magic link
- Expandable: add new organizations, scale to additional teams

---

## Security

- **Google sign-in or email magic links** — no passwords to manage or leak
- **Encryption at rest**: All sensitive data (loyalty numbers, passport info, confirmation codes) encrypted with AES-256-GCM
- **No full credit card numbers stored** — only card type and last 4 digits for display
- **Role-based access control**: Every API endpoint checks your role before granting access
- **Audit logging**: Every sensitive action is logged (who did what, when, from where)
- **Input validation**: All data validated before it touches the database
- **Secure sessions**: HTTP-only cookies, automatic expiry, CSRF protection

---

## AI Model Transparency

- The app uses multiple AI models, each chosen for what it does best (flight data extraction, reasoning about points, real-time research, conversation)
- You can see which model powered each response
- Default model is configurable in settings
- No vendor lock-in — the architecture supports swapping or adding models as the technology evolves

---

## Coming Soon (Planned Features)

These are on the roadmap and the system is designed to support them:

- **Interactive trip map** — See your entire trip on Google Maps with pins for every flight, hotel, restaurant, and meeting, with directions between stops
- **Restaurant reservations** — Book restaurants directly through the app (OpenTable / Resy integration)
- **Visa & arrival card auto-fill** — Automatically fill out visa applications and electronic arrival cards using your stored passport and travel document data
- **Ground transportation** — Book car services, airport transfers, and train tickets
- **Voice input** — Speak your travel requests instead of typing
- **Multi-city trip optimizer** — For complex multi-leg trips, the AI suggests the optimal order of cities to minimize backtracking and cost
- **Travel insurance comparison** — Compare and recommend travel insurance policies based on trip value, destination risk, and medical coverage needs
- **Lounge finder** — Based on your cards and status, show which lounges you can access at every airport in your itinerary, with hours and reviews
- **Destination briefing** — AI-generated briefing for each destination: weather forecast, local customs, tipping norms, emergency numbers, embassy contact, SIM card / eSIM options, power adapter needs

---

## How to Get Started

1. Sign in with your Google account or email
2. Set up your profile: add your frequent flyer numbers, credit cards, and preferences
3. Create or join your family and/or business organization
4. Start chatting: *"Plan a trip to..."*

---

*Built with institutional-grade security for personal and business use. Your data is encrypted, your cards are safe, and your travel is optimized.*
