"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ModelSelector } from "./model-selector";
import { FlightResultsCard } from "./flight-results-card";
import type { FlightOffer, FlightResultData } from "./flight-results-card";
import { HotelResultsCard } from "./hotel-results-card";
import type { HotelOfferDisplay, HotelResultData } from "./hotel-results-card";
import { HotelDeepDiveSheet } from "./hotel-deep-dive-sheet";
import { toast } from "sonner";
import { FlightSearchSkeleton, HotelSearchSkeleton } from "./search-skeleton";
import { DEFAULT_MODEL_ID, AVAILABLE_MODELS } from "@/lib/ai/providers";
import { chatStore } from "@/lib/chat-store";
import type { ChatMessage as StoreChatMessage } from "@/lib/chat-store";
import {
  Plane,
  Plus,
  History,
  MessageSquare,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  modelUsed: string;
  createdAt: string;
}

// Hook to subscribe to the global chat store
function useChatStore() {
  const messages = useSyncExternalStore(
    (cb) => chatStore.subscribe(cb),
    () => chatStore.getMessages(),
    () => chatStore.getMessages()
  );
  const isLoading = useSyncExternalStore(
    (cb) => chatStore.subscribe(cb),
    () => chatStore.getIsLoading(),
    () => chatStore.getIsLoading()
  );
  const conversationId = useSyncExternalStore(
    (cb) => chatStore.subscribe(cb),
    () => chatStore.getConversationId(),
    () => chatStore.getConversationId()
  );
  return { messages, isLoading, conversationId };
}

export function ChatPanel() {
  const { messages, isLoading, conversationId } = useChatStore();
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(true); // Show by default
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [deepDiveHotel, setDeepDiveHotel] = useState<HotelOfferDisplay | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/chat");
    if (res.ok) {
      const data = await res.json();
      const convs = data.conversations || [];
      setConversations(convs);
      // Auto-hide history panel if no conversations exist
      if (!historyLoaded) {
        setHistoryLoaded(true);
        if (convs.length === 0) setShowHistory(false);
      }
    }
  }, [historyLoaded]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Reload conversation list when loading finishes (new conversation created)
  useEffect(() => {
    if (!isLoading) {
      loadConversations();
    }
  }, [isLoading, loadConversations]);

  // Load a specific conversation
  const loadConversation = async (convId: string) => {
    const res = await fetch(`/api/chat?conversationId=${convId}`);
    if (res.ok) {
      const data = await res.json();
      chatStore.setMessages(
        data.messages.map(
          (m: { id: string; role: string; content: string; modelUsed?: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            modelUsed: m.modelUsed,
          })
        )
      );
      chatStore.setConversationId(convId);
      setShowHistory(false);
    }
  };

  const startNewConversation = () => {
    chatStore.abort();
    chatStore.clearMessages();
    setShowHistory(false);
  };

  const deleteConversation = async (convId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const res = await fetch(`/api/chat?conversationId=${convId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Conversation deleted");
      if (conversationId === convId) {
        startNewConversation();
      }
      loadConversations();
    }
  };

  const clearAllConversations = async () => {
    if (!confirm("Delete all conversations? This cannot be undone.")) return;
    const res = await fetch("/api/chat?all=true", { method: "DELETE" });
    if (res.ok) {
      toast.success("All conversations cleared");
      startNewConversation();
      loadConversations();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput("");
    // Fire and forget — the store manages the stream lifecycle
    chatStore.sendMessage(msg, modelId);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* History sidebar */}
      {showHistory && (
        <div className="w-80 border-r bg-muted/10 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Recent Chats</h3>
              {conversations.length > 0 && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                  {conversations.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {conversations.length > 0 && (
                <button
                  onClick={clearAllConversations}
                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  title="Clear all conversations"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded hover:bg-muted/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {conversations.length > 0 && (
            <div className="px-4 py-2 border-b bg-amber-500/5">
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                💡 Continue an existing chat to add flights & hotels to the same trip
              </p>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground/60">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/40 mt-1">
                  Start a new chat to plan a trip
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg text-sm transition-colors",
                    conv.id === conversationId
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                      : "hover:bg-muted/50 text-muted-foreground border border-transparent"
                  )}
                >
                  <button
                    onClick={() => loadConversation(conv.id)}
                    className="flex-1 text-left px-3 py-2.5 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 flex-shrink-0 text-muted-foreground/50" />
                      <p className="truncate font-medium text-xs">
                        {conv.title || "Untitled"}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 ml-5">
                      {new Date(conv.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all mr-1 flex-shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              showHistory
                ? "bg-emerald-500/10 text-emerald-500"
                : "hover:bg-muted/50 text-muted-foreground"
            )}
            title="Conversation history"
          >
            <History className="w-3.5 h-3.5" />
            {!showHistory && conversations.length > 0 && (
              <span>Chats ({conversations.length})</span>
            )}
          </button>
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-muted/50 text-muted-foreground transition-colors"
            title="New conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          <ModelSelector
            selectedModelId={modelId}
            onModelChange={setModelId}
          />
          <div className="flex-1" />
          {isLoading && (
            <span className="text-[10px] text-emerald-400 animate-pulse">
              ● Generating...
            </span>
          )}
          {conversationId && !isLoading && (
            <span className="text-[10px] text-muted-foreground/40">
              {messages.filter((m: StoreChatMessage) => m.role === "user").length} messages
            </span>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={(text) => setInput(text)} />
          ) : (
            <div className="max-w-3xl mx-auto py-4">
              {messages
                .filter((msg: StoreChatMessage) => {
                  // Hide raw CONFIRM messages from display (#10)
                  if (msg.role === "user" && msg.content.startsWith("CONFIRM:")) return false;
                  // Hide the stub "Added to your trip." response
                  if (msg.role === "assistant" && msg.content === "Added to your trip.") return false;
                  return true;
                })
                .map((msg: StoreChatMessage) => (
                <div key={msg.id}>
                  {msg.tripCreated && (
                    <div className="mx-4 my-2">
                      <a
                        href={`/trips/${msg.tripCreated.tripId}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Plane className="h-3.5 w-3.5" />
                        Trip created: {msg.tripCreated.title}
                        <span className="text-xs text-muted-foreground">→ View</span>
                      </a>
                    </div>
                  )}
                  {msg.flightResults && (
                    <FlightResultsCard
                      results={msg.flightResults as unknown as FlightResultData}
                      onSelectFlight={(offer: FlightOffer) => {
                        const seg = offer.outbound?.[0];
                        const lastSeg = offer.outbound?.[offer.outbound.length - 1];
                        const tripId = chatStore.getActiveTripId();
                        const tripRef = tripId ? ` Use tripId="${tripId}".` : "";
                        const selectMsg = `CONFIRM: Add ${offer.airlines[0]} ${seg?.flightNumber || ""} (${seg?.origin}→${lastSeg?.destination}, departs ${seg?.departureTime || ""}, arrives ${lastSeg?.arrivalTime || ""}, $${offer.totalPrice} ${offer.currency}) to my trip.${tripRef} Do NOT create a new trip — use add_flight_to_trip tool immediately with the existing trip.`;
                        chatStore.sendMessage(selectMsg, modelId);
                        toast.info(`Adding ${offer.airlines[0]} ${seg?.flightNumber || ""} to trip...`);
                      }}
                      onActionChip={(text: string) => {
                        chatStore.sendMessage(text, modelId);
                      }}
                    />
                  )}
                  {msg.hotelResults && (
                    <HotelResultsCard
                      results={msg.hotelResults as unknown as HotelResultData}
                      onHotelDeepDive={(offer: HotelOfferDisplay) => setDeepDiveHotel(offer)}
                      onSelectHotel={(offer: HotelOfferDisplay) => {
                        const tripId = chatStore.getActiveTripId();
                        const tripRef = tripId ? ` Use tripId="${tripId}".` : "";
                        const selectMsg = `CONFIRM: Add ${offer.name} (${offer.starRating ? offer.starRating + "-star, " : ""}$${offer.pricePerNight}/night, ${offer.nights} nights, total $${offer.totalPrice}) to my trip as hotel.${tripRef} Do NOT create a new trip — use add_hotel_to_trip tool immediately.`;
                        chatStore.sendMessage(selectMsg, modelId);
                        toast.info(`Adding ${offer.name} to trip...`);
                      }}
                      onActionChip={(text: string) => {
                        chatStore.sendMessage(text, modelId);
                      }}
                    />
                  )}
                  {/* Show skeleton while searching */}
                  {msg.role === "assistant" && msg.content.startsWith("🔍") && isLoading && msg === messages[messages.length - 1] && (
                    msg.content.toLowerCase().includes("hotel")
                      ? <HotelSearchSkeleton />
                      : <FlightSearchSkeleton />
                  )}
                  <ChatMessage
                    role={msg.role}
                    content={msg.content}
                    modelName={msg.modelUsed}
                    isStreaming={
                      isLoading &&
                      msg.role === "assistant" &&
                      msg === messages[messages.length - 1]
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>

      {/* Hotel Deep-Dive Sheet */}
      <HotelDeepDiveSheet
        hotel={deepDiveHotel}
        onClose={() => setDeepDiveHotel(null)}
        onSelectHotel={(offer: HotelOfferDisplay) => {
          setDeepDiveHotel(null);
          const tripId = chatStore.getActiveTripId();
          const tripRef = tripId ? ` Use tripId="${tripId}".` : "";
          const selectMsg = `CONFIRM: Add ${offer.name} (${offer.starRating ? offer.starRating + "-star, " : ""}$${offer.pricePerNight}/night, ${offer.nights} nights, total $${offer.totalPrice}) to my trip as hotel.${tripRef} Do NOT create a new trip — use add_hotel_to_trip tool immediately.`;
          chatStore.sendMessage(selectMsg, modelId);
          toast.info(`Adding ${offer.name} to trip...`);
        }}
      />
    </div>
  );
}

// FlightResultsCard moved to ./flight-results-card.tsx

// ── Empty State ──

function EmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <Plane className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Where are you headed?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Tell me about your trip and I&apos;ll help you find the best flights,
          hotels, and deals. I can optimize for points, price, or comfort.
        </p>
        <div className="grid grid-cols-1 gap-2 text-left">
          {[
            "Find me business class flights from NYC to Tokyo in June",
            "I need a 3-night hotel in London near the financial district",
            "What's the best way to use my Chase points for a family trip to Hawaii?",
            "Compare economy vs business for LAX to Singapore",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-border/40 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-xs text-muted-foreground hover:text-foreground transition-all text-left"
            >
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-emerald-500/50 flex-shrink-0" />
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
