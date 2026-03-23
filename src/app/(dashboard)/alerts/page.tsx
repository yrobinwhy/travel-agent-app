import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceWatches } from "@/lib/db/schema/trips";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Bell, TrendingDown, Plane, Clock } from "lucide-react";
import Link from "next/link";

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const watches = await db
    .select()
    .from(priceWatches)
    .where(eq(priceWatches.userId, session.user.id))
    .orderBy(desc(priceWatches.createdAt));

  const activeWatches = watches.filter((w) => w.isActive);

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Alerts</h1>
        {activeWatches.length > 0 && (
          <Badge variant="outline" className="ml-auto text-xs">
            {activeWatches.length} active
          </Badge>
        )}
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
        {watches.length > 0 ? (
          watches.map((watch) => {
            const savings = watch.savingsAvailable && watch.savingsAvailable > 0;
            return (
              <Card key={watch.id} className={`card-hover ${savings ? "border-emerald-500/30" : ""}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${savings ? "bg-emerald-500/10" : "bg-blue-500/10"}`}>
                    {savings ? (
                      <TrendingDown className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Plane className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">
                      {watch.origin} → {watch.destination}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {watch.travelDate && (
                        <span>{new Date(watch.travelDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                      {watch.cabinClass && <span>{watch.cabinClass}</span>}
                      {watch.lastChecked && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Checked {new Date(watch.lastChecked).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {watch.originalPrice && (
                      <p className="text-xs text-muted-foreground line-through">
                        ${watch.originalPrice.toLocaleString()}
                      </p>
                    )}
                    {watch.currentBestPrice && (
                      <p className={`font-medium text-sm ${savings ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        ${watch.currentBestPrice.toLocaleString()}
                      </p>
                    )}
                    {savings && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        Save ${watch.savingsAvailable?.toLocaleString()}
                      </Badge>
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
                <Bell className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-medium mb-1">No price alerts yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                When you search for flights, ask the AI to set up a price watch. You&apos;ll get notified when prices drop or better deals appear.
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
