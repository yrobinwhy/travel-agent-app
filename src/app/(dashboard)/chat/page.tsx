import { ChatPanel } from "@/components/chat/chat-panel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <header className="flex h-14 items-center gap-4 border-b px-6 flex-shrink-0">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Travel Concierge</h1>
      </header>
      <ChatPanel />
    </div>
  );
}
