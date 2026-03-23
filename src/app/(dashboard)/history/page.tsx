import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userTravelHistory } from "@/lib/db/schema/trips";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { History, Plane, Hotel, Star, MapPin } from "lucide-react";
import Link from "next/link";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const history = await db
    .select()
    .from(userTravelHistory)
    .where(eq(userTravelHistory.userId, session.user.id))
    .orderBy(desc(userTravelHistory.traveledAt));

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Travel History</h1>
        {history.length > 0 && (
          <Badge variant="outline" className="ml-auto text-xs">{history.length} trips</Badge>
        )}
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
        {history.length > 0 ? (
          history.map((item) => (
            <Card key={item.id} className="card-hover">
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  item.type === "flight" ? "bg-blue-500/10" : "bg-purple-500/10"
                }`}>
                  {item.type === "flight" ? (
                    <Plane className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Hotel className="h-5 w-5 text-purple-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item.routeOrLocation || item.vendor || "Trip"}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {item.vendor && <span>{item.vendor}</span>}
                    {item.cabinClass && <span>{item.cabinClass}</span>}
                    {item.traveledAt && (
                      <span>{new Date(item.traveledAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                </div>
                {item.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <History className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-medium mb-1">No travel history yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                As you complete trips, your travel history will build here. The AI uses this to learn your preferences and suggest better options.
              </p>
              <Link href="/chat" className="mt-3">
                <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                  Plan your first trip →
                </Badge>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
