import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/trips";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Receipt, DollarSign, Plane, Hotel, Car } from "lucide-react";
import Link from "next/link";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, session.user.id))
    .orderBy(desc(bookings.createdAt));

  const totalSpend = userBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
  const flightSpend = userBookings.filter(b => b.type === "flight").reduce((sum, b) => sum + (b.totalCost || 0), 0);
  const hotelSpend = userBookings.filter(b => b.type === "hotel").reduce((sum, b) => sum + (b.totalCost || 0), 0);
  const otherSpend = totalSpend - flightSpend - hotelSpend;

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Expenses</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {userBookings.length > 0 ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Spend", value: totalSpend, icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10" },
                { label: "Flights", value: flightSpend, icon: Plane, color: "text-blue-500 bg-blue-500/10" },
                { label: "Hotels", value: hotelSpend, icon: Hotel, color: "text-purple-500 bg-purple-500/10" },
                { label: "Other", value: otherSpend, icon: Car, color: "text-amber-500 bg-amber-500/10" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.color}`}>
                        <stat.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold font-mono">
                      ${stat.value.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Booking list */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">All Bookings</h3>
              {userBookings.map((b) => (
                <Card key={b.id} className="card-hover">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">{b.type}</Badge>
                      <span className="text-sm">{b.vendorName || "Unnamed"}</span>
                      <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                    </div>
                    <span className="font-mono font-medium text-sm">
                      {b.totalCost ? `$${b.totalCost.toLocaleString()}` : "—"}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <Receipt className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-medium mb-1">No expenses tracked yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                As you book flights and hotels, costs will be tracked here automatically with breakdowns by category.
              </p>
              <Link href="/chat" className="mt-3">
                <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                  Start booking →
                </Badge>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
