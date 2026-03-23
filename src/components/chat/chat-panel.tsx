"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ModelSelector } from "./model-selector";
import { FlightResultsCard } from "./flight-results-card";
import type { FlightOffer, FlightResultData } from "./flight-results-card";
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
  const [showHistory, setShowHistory] = useState(false);
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
      setConversations(data.conversations || []);
    }
  }, []);

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
        <div className="w-72 border-r bg-muted/20 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-medium">Conversations</h3>
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg text-sm transition-colors",
                    conv.id === conversationId
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <button
                    onClick={() => loadConversation(conv.id)}
                    className="flex-1 text-left px-3 py-2 min-w-0"
                  >
                    <p className="truncate font-medium text-xs">
                      {conv.title || "Untitled"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {new Date(conv.createdAt).toLocaleDateString()}
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
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"
            title="Conversation history"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
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
              {messages.map((msg: StoreChatMessage) => (
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
                        const selectMsg = `I'd like to select the ${offer.airlines.join("/")} flight${seg?.flightNumber ? ` ${seg.flightNumber}` : ""} (${seg?.origin} → ${offer.outbound?.[offer.outbound.length - 1]?.destination}) at $${offer.totalPrice}${offer.refundable ? " (refundable)" : ""}. Please add it to my trip.`;
                        setInput(selectMsg);
                      }}
                      onActionChip={(text: string) => {
                        chatStore.sendMessage(text, modelId);
                      }}
                    />
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
