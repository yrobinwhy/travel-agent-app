import { getTripWithSegments, updateTrip, deleteTrip, deleteSegment } from "@/lib/db/queries/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Hotel,
  Car,
  Utensils,
  MapPin,
  Calendar,
  Clock,
  Trash2,
  ArrowLeft,
  Download,
  CalendarPlus,
  Users,
  StickyNote,
  Briefcase,
  Bus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const segmentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  hotel_night: Hotel,
  car_pickup: Car,
  car_return: Car,
  restaurant: Utensils,
  meeting: Briefcase,
  activity: MapPin,
  transfer: Bus,
  note: StickyNote,
};

const segmentColors: Record<string, string> = {
  flight: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hotel_night: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  car_pickup: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  car_return: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  restaurant: "bg-red-500/10 text-red-600 dark:text-red-400",
  meeting: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  activity: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  transfer: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  note: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const statusColors: Record<string, string> = {
  planning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  booked: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatTime(date: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripWithSegments(id);

  if (!trip) {
    redirect("/trips");
  }

  // Group segments by date
  const segmentsByDate = new Map<string, typeof trip.segments>();
  for (const seg of trip.segments) {
    const dateKey = seg.startAt
      ? new Date(seg.startAt).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Unscheduled";
    if (!segmentsByDate.has(dateKey)) {
      segmentsByDate.set(dateKey, []);
    }
    segmentsByDate.get(dateKey)!.push(seg);
  }

  // Calculate trip cost
  const totalCost = trip.bookings.reduce(
    (sum, b) => sum + (b.totalCost || 0),
    0
  );

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <Link
          href="/trips"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">{trip.title}</h1>
        <Badge
          variant="outline"
          className={statusColors[trip.status] || ""}
        >
          {trip.status.replace("_", " ")}
        </Badge>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Trip Overview */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {trip.destinationCity && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {trip.destinationCity}
              {trip.destinationCountry && `, ${trip.destinationCountry}`}
            </span>
          )}
          {trip.startDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(trip.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {trip.endDate && (
                <>
                  {" → "}
                  {new Date(trip.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </span>
          )}
          {totalCost > 0 && (
            <span className="font-medium text-foreground">
              ${totalCost.toLocaleString()} total
            </span>
          )}
          {trip.segments.length > 0 && (
            <span>
              {trip.segments.length} items
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <a href={`/api/trips/${id}/export`} download>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
            </Button>
          </a>
          <a href={`/api/trips/${id}/calendar`} download>
            <Button variant="outline" size="sm">
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Add to Calendar
            </Button>
          </a>
        </div>

        {/* Itinerary Timeline */}
        {trip.segments.length > 0 ? (
          <div className="space-y-6">
            {Array.from(segmentsByDate.entries()).map(([dateLabel, segs]) => (
              <div key={dateLabel}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {dateLabel}
                </h3>
                <div className="space-y-2 relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />

                  {segs.map((seg) => {
                    const Icon = segmentIcons[seg.type] || MapPin;
                    const color = segmentColors[seg.type] || segmentColors.note;

                    return (
                      <div key={seg.id} className="flex gap-3 relative">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg ${color} flex items-center justify-center z-10`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <Card className="flex-1">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {seg.title ||
                                    (seg.type === "flight"
                                      ? `${seg.carrier || ""} ${seg.flightNumber || ""} · ${seg.origin} → ${seg.destination}`
                                      : seg.type.replace("_", " "))}
                                </p>
                                {seg.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {seg.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  {seg.startAt && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(seg.startAt)}
                                      {seg.endAt && ` → ${formatTime(seg.endAt)}`}
                                    </span>
                                  )}
                                  {seg.locationName && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {seg.locationName}
                                    </span>
                                  )}
                                  {seg.cabinClass && (
                                    <Badge variant="outline" className="text-[10px] py-0">
                                      {seg.cabinClass}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <form action={deleteSegment}>
                                <input type="hidden" name="segmentId" value={seg.id} />
                                <input type="hidden" name="tripId" value={trip.id} />
                                <button
                                  type="submit"
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <Calendar className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-medium mb-1">No itinerary items yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask the AI concierge to plan this trip, or add flights and hotels from the chat.
              </p>
              <Link href="/chat" className="mt-3">
                <Button variant="outline" size="sm">
                  Go to Chat
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Trip Notes */}
        {trip.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {trip.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Trip */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateTrip} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="hidden" name="tripId" value={trip.id} />
              <div className="space-y-2">
                <Label htmlFor="edit-title">Trip Name</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={trip.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  name="status"
                  defaultValue={trip.status}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="planning">Planning</option>
                  <option value="booked">Booked</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">Destination City</Label>
                <Input
                  id="edit-city"
                  name="destinationCity"
                  defaultValue={trip.destinationCity || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  name="destinationCountry"
                  defaultValue={trip.destinationCountry || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  name="startDate"
                  type="date"
                  defaultValue={trip.startDate || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Date</Label>
                <Input
                  id="edit-end"
                  name="endDate"
                  type="date"
                  defaultValue={trip.endDate || ""}
                />
              </div>
              <div className="md:col-span-2 flex justify-between">
                <form action={deleteTrip}>
                  <input type="hidden" name="tripId" value={trip.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Trip
                  </Button>
                </form>
                <SubmitButton>Save Changes</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
