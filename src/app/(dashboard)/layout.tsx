import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { hasUnviewedTripUpdates } from "@/lib/db/queries/activity";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Check for unviewed trip updates (for notification dot)
  let tripsUpdates = false;
  try {
    tripsUpdates = await hasUnviewedTripUpdates();
  } catch {
    // Silently fail — don't break layout
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user!} hasTripsUpdates={tripsUpdates} />
      <SidebarInset>{children}</SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
