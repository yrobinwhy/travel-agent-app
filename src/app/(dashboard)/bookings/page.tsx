import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/trips";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Hotel,
  Car,
  Utensils,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import Link from "next/link";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
  restaurant: Utensils,
  activity: MapPin,
  meeting: FileText,
  transfer: Car,
};

const typeColors: Record<string, string> = {
  flight: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hotel: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  car: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  restaurant: "bg-red-500/10 text-red-600 dark:text-red-400",
  activity: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  meeting: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  transfer: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

const statusStyles: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, session.user.id))
    .orderBy(desc(bookings.createdAt));

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Bookings</h1>
        <Badge variant="outline" className="ml-auto text-xs">
          {userBookings.length} total
        </Badge>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
        {userBookings.length > 0 ? (
          userBookings.map((booking) => {
            const Icon = typeIcons[booking.type] || Plane;
            const color = typeColors[booking.type] || typeColors.flight;

            return (
              <Card key={booking.id} className="card-hover">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">
                        {booking.vendorName || booking.type.charAt(0).toUpperCase() + booking.type.slice(1)}
                      </h3>
                      <Badge variant="outline" className={`text-[10px] ${statusStyles[booking.status] || ""}`}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {booking.checkInAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(booking.checkInAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      {booking.tripId && (
                        <Link
                          href={`/trips/${booking.tripId}`}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          View trip →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {booking.totalCost ? (
                      <p className="font-medium text-sm flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {booking.totalCost.toLocaleString()} {booking.currency}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No price</p>
                    )}
                    {booking.pointsUsed && booking.pointsUsed > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        + {booking.pointsUsed.toLocaleString()} pts
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <Plane className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-medium mb-1">No bookings yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                When you confirm flights, hotels, or other reservations through the chat, they&apos;ll appear here with confirmation details and fare rules.
              </p>
              <Link href="/chat" className="mt-3">
                <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                  Go to Chat →
                </Badge>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
