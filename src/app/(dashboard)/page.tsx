import { auth } from "@/lib/auth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  MessageSquare,
  Plane,
  Map,
  TrendingUp,
  Star,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h2>
          <p className="text-muted-foreground">
            Plan your next trip, check deals, or manage your bookings.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Start Planning
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                Tell the AI where you want to go. It handles the rest.
              </CardDescription>
              <Link
                href="/chat"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                New Conversation
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Trips
              </CardTitle>
              <Map className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                No upcoming trips yet. Start planning one!
              </CardDescription>
              <Link
                href="/trips"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                View All Trips
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Points &amp; Deals
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                Track your points and catch transfer bonuses.
              </CardDescription>
              <Link
                href="/points"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                Manage Points
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Set Up</CardTitle>
            <CardDescription>
              Complete these steps to unlock the full power of TravelAgent Pro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  label: "Add your frequent flyer programs",
                  href: "/points",
                  icon: Plane,
                },
                {
                  label: "Add your credit cards",
                  href: "/cards",
                  icon: Star,
                },
                {
                  label: "Set your travel preferences",
                  href: "/settings",
                  icon: TrendingUp,
                },
                {
                  label: "Set up notifications",
                  href: "/settings",
                  icon: Bell,
                },
              ].map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{step.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
