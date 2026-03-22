import { ChatPanel } from "@/components/chat/chat-panel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <header className="flex h-12 items-center gap-4 border-b px-4 flex-shrink-0">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-sm font-semibold">Travel Concierge</h1>
      </header>
      <ChatPanel />
    </div>
  );
}
