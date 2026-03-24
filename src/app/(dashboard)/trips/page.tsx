import { getUserTrips, getSharedTrips, createTrip, deleteTrip } from "@/lib/db/queries/trips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Plus,
  MapPin,
  Calendar,
  Trash2,
  ChevronRight,
  Users,
} from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  planning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  booked: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function TripCard({ trip, shared }: { trip: { id: string; title: string; destinationCity: string | null; destinationCountry: string | null; startDate: string | null; endDate: string | null; status: string; ownerName?: string | null; ownerEmail?: string | null }; shared?: boolean }) {
  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="card-hover cursor-pointer group">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${shared ? 'bg-blue-500/10 dark:bg-blue-400/10' : 'bg-emerald-500/10 dark:bg-emerald-400/10'}`}>
              {shared ? (
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Plane className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {trip.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {shared && trip.ownerName && (
                  <span className="text-blue-600 dark:text-blue-400">
                    by {trip.ownerName || trip.ownerEmail}
                  </span>
                )}
                {trip.destinationCity && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {trip.destinationCity}
                    {trip.destinationCountry && `, ${trip.destinationCountry}`}
                  </span>
                )}
                {trip.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
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
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {shared && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">
                Shared
              </Badge>
            )}
            <Badge
              variant="outline"
              className={statusColors[trip.status] || ""}
            >
              {statusLabels[trip.status] || trip.status}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function TripsPage() {
  const [myTrips, sharedTrips] = await Promise.all([
    getUserTrips(),
    getSharedTrips(),
  ]);

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Trips</h1>
        {sharedTrips.length > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            {sharedTrips.length} shared
          </Badge>
        )}
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* My Trips */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">My Trips</h2>
          {myTrips.length > 0 ? (
            <div className="space-y-3">
              {myTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                  <Plane className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-medium mb-1">No trips yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Create your first trip below, or ask the AI concierge to plan one for you in the chat.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shared Trips */}
        {sharedTrips.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Shared with me
            </h2>
            <div className="space-y-3">
              {sharedTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} shared />
              ))}
            </div>
          </div>
        )}

        {/* Create Trip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> New Trip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTrip} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Trip Name</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g., Tokyo Business Trip"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCity">Destination City</Label>
                <Input
                  id="destinationCity"
                  name="destinationCity"
                  placeholder="e.g., Tokyo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">Country</Label>
                <Input
                  id="destinationCountry"
                  name="destinationCountry"
                  placeholder="e.g., Japan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Any special requirements"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <SubmitButton>Create Trip</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
