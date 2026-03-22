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
  ArrowRight,
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

      <div className="flex-1 space-y-6 p-6 animate-fade-in">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-6 text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent" />
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h2>
            <p className="mt-1 text-white/80 max-w-lg">
              Plan your next trip, check deals, or manage your bookings. Just tell the AI where you want to go.
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-premium hover:bg-white/30"
            >
              <MessageSquare className="h-4 w-4" />
              Start a conversation
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick action cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Start Planning
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10">
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
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

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Trips
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 dark:bg-violet-400/10">
                <Map className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
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

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Points &amp; Deals
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/10">
                <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
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

        {/* Setup checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Get Set Up</CardTitle>
            <CardDescription>
              Complete these steps to unlock the full power of TravelAgent Pro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 stagger-fade-in">
              {[
                {
                  label: "Add your frequent flyer programs",
                  href: "/points",
                  icon: Plane,
                  color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-400/10",
                },
                {
                  label: "Add your credit cards",
                  href: "/cards",
                  icon: Star,
                  color: "text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-400/10",
                },
                {
                  label: "Set your travel preferences",
                  href: "/settings",
                  icon: TrendingUp,
                  color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10",
                },
                {
                  label: "Set up notifications",
                  href: "/settings",
                  icon: Bell,
                  color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10",
                },
              ].map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="group flex items-center gap-3 rounded-lg border p-3 transition-premium hover:bg-accent hover:border-primary/20"
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", step.color)}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
