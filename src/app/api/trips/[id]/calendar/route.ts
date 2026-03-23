import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips, itinerarySegments } from "@/lib/db/schema/trips";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, session.user.id)));

  if (!trip) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  const segments = await db
    .select()
    .from(itinerarySegments)
    .where(eq(itinerarySegments.tripId, id))
    .orderBy(itinerarySegments.startAt);

  // Generate ICS (iCalendar) format
  const icsLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TravelAgent Pro//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(trip.title)}`,
  ];

  for (const seg of segments) {
    if (!seg.startAt) continue;

    const uid = `${seg.id}@travelagent.pro`;
    const dtstart = formatIcsDate(seg.startAt, seg.timezone);
    const dtend = seg.endAt
      ? formatIcsDate(seg.endAt, seg.timezone)
      : formatIcsDate(new Date(seg.startAt.getTime() + 3600000), seg.timezone); // default 1 hour

    const summary =
      seg.title ||
      (seg.type === "flight"
        ? `${seg.carrier || ""} ${seg.flightNumber || ""} · ${seg.origin} → ${seg.destination}`
        : seg.type.replace("_", " "));

    const description: string[] = [];
    if (seg.description) description.push(seg.description);
    if (seg.type === "flight") {
      if (seg.carrier) description.push(`Airline: ${seg.carrier}`);
      if (seg.flightNumber) description.push(`Flight: ${seg.flightNumber}`);
      if (seg.cabinClass) description.push(`Cabin: ${seg.cabinClass}`);
      if (seg.terminal) description.push(`Terminal: ${seg.terminal}`);
      if (seg.gate) description.push(`Gate: ${seg.gate}`);
      if (seg.seat) description.push(`Seat: ${seg.seat}`);
    }

    const location = seg.locationName
      ? seg.locationAddress
        ? `${seg.locationName}, ${seg.locationAddress}`
        : seg.locationName
      : seg.locationAddress || "";

    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTART:${dtstart}`);
    icsLines.push(`DTEND:${dtend}`);
    icsLines.push(`SUMMARY:${escapeIcs(summary)}`);
    if (description.length) {
      icsLines.push(`DESCRIPTION:${escapeIcs(description.join("\\n"))}`);
    }
    if (location) {
      icsLines.push(`LOCATION:${escapeIcs(location)}`);
    }
    if (seg.locationLat && seg.locationLng) {
      icsLines.push(`GEO:${seg.locationLat};${seg.locationLng}`);
    }
    icsLines.push(`DTSTAMP:${formatIcsDate(new Date())}`);

    // Alarm: 1 hour before for flights, 30 min for others
    const alarmMinutes = seg.type === "flight" ? 120 : 30;
    icsLines.push("BEGIN:VALARM");
    icsLines.push("ACTION:DISPLAY");
    icsLines.push(`DESCRIPTION:${escapeIcs(summary)} starting soon`);
    icsLines.push(`TRIGGER:-PT${alarmMinutes}M`);
    icsLines.push("END:VALARM");

    icsLines.push("END:VEVENT");
  }

  // Also add the trip itself as an all-day event if dates are set
  if (trip.startDate) {
    const uid = `trip-${trip.id}@travelagent.pro`;
    const start = trip.startDate.replace(/-/g, "");
    const end = trip.endDate
      ? trip.endDate.replace(/-/g, "")
      : start;

    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTART;VALUE=DATE:${start}`);
    icsLines.push(`DTEND;VALUE=DATE:${end}`);
    icsLines.push(`SUMMARY:${escapeIcs(`✈️ ${trip.title}`)}`);
    if (trip.destinationCity) {
      icsLines.push(
        `LOCATION:${escapeIcs(trip.destinationCity + (trip.destinationCountry ? `, ${trip.destinationCountry}` : ""))}`
      );
    }
    icsLines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    icsLines.push("END:VEVENT");
  }

  icsLines.push("END:VCALENDAR");

  const icsContent = icsLines.join("\r\n");
  const filename = `${trip.title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;

  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function formatIcsDate(date: Date, timezone?: string | null): string {
  // Format as UTC: YYYYMMDDTHHMMSSZ
  const d = new Date(date);
  return (
    d.getUTCFullYear().toString() +
    (d.getUTCMonth() + 1).toString().padStart(2, "0") +
    d.getUTCDate().toString().padStart(2, "0") +
    "T" +
    d.getUTCHours().toString().padStart(2, "0") +
    d.getUTCMinutes().toString().padStart(2, "0") +
    d.getUTCSeconds().toString().padStart(2, "0") +
    "Z"
  );
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
