import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips, itinerarySegments, bookings } from "@/lib/db/schema/trips";
import { eq, and } from "drizzle-orm";
import jsPDF from "jspdf";

export const maxDuration = 15;

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

  const tripBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.tripId, id))
    .orderBy(bookings.checkInAt);

  // Generate PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) addPage();
  };

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(trip.title, pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  const headerParts: string[] = [];
  if (trip.destinationCity) {
    headerParts.push(
      `${trip.destinationCity}${trip.destinationCountry ? `, ${trip.destinationCountry}` : ""}`
    );
  }
  if (trip.startDate) {
    const start = new Date(trip.startDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const end = trip.endDate
      ? new Date(trip.endDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    headerParts.push(end ? `${start} — ${end}` : start);
  }
  if (headerParts.length) {
    doc.text(headerParts.join(" · "), pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  doc.text(`Status: ${trip.status.replace("_", " ").toUpperCase()}`, pageWidth / 2, y, {
    align: "center",
  });
  y += 4;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Bookings summary
  if (tripBookings.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Bookings", 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    for (const booking of tripBookings) {
      checkPageBreak(12);
      const cost = booking.totalCost
        ? ` — ${booking.currency} ${booking.totalCost.toLocaleString()}`
        : "";
      doc.setFont("helvetica", "bold");
      doc.text(
        `${booking.type.toUpperCase()}: ${booking.vendorName || "TBD"}${cost}`,
        25,
        y
      );
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Status: ${booking.status} · ID: ${booking.id.slice(0, 8)}`, 25, y);
      doc.setTextColor(0, 0, 0);
      y += 7;
    }
    y += 5;
  }

  // Itinerary
  if (segments.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Itinerary", 20, y);
    y += 8;

    let currentDate = "";

    for (const seg of segments) {
      const dateKey = seg.startAt
        ? new Date(seg.startAt).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
        : "Unscheduled";

      if (dateKey !== currentDate) {
        checkPageBreak(15);
        currentDate = dateKey;
        y += 3;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 128, 96); // Emerald
        doc.text(dateKey, 20, y);
        doc.setTextColor(0, 0, 0);
        y += 7;
      }

      checkPageBreak(18);

      // Time
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      if (seg.startAt) {
        const time = new Date(seg.startAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        doc.text(time, 25, y);
      }

      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      const title =
        seg.title ||
        (seg.type === "flight"
          ? `${seg.carrier || ""} ${seg.flightNumber || ""} · ${seg.origin} → ${seg.destination}`
          : seg.type.replace("_", " "));
      doc.text(title, 55, y);
      y += 5;

      // Details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const details: string[] = [];
      if (seg.locationName) details.push(seg.locationName);
      if (seg.cabinClass) details.push(seg.cabinClass);
      if (seg.description) details.push(seg.description);
      if (details.length) {
        doc.text(details.join(" · "), 55, y);
        y += 4;
      }
      doc.setTextColor(0, 0, 0);
      y += 4;
    }
  }

  // Notes
  if (trip.notes) {
    checkPageBreak(20);
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(trip.notes, pageWidth - 50);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, 25, y);
      y += 5;
    }
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated by TravelAgent Pro · ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    285,
    { align: "center" }
  );

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `${trip.title.replace(/[^a-zA-Z0-9]/g, "-")}-itinerary.pdf`;

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
