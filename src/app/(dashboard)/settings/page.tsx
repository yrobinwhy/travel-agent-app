import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </>
  );
}
