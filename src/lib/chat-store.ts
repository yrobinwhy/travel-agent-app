"use client";

// Global chat store — survives navigation between pages
// The SSE stream runs detached from React lifecycle

type FlightResultData = {
  offers: Array<Record<string, unknown>>;
  cheapestPrice?: number;
  fastestDuration?: string;
  providers: string[];
  errors?: Array<{ provider: string; error: string }>;
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  flightResults?: FlightResultData;
}

type Listener = () => void;

class ChatStore {
  private messages: ChatMessage[] = [];
  private conversationId: string | null = null;
  private isLoading = false;
  private listeners = new Set<Listener>();
  private abortController: AbortController | null = null;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getMessages() {
    return this.messages;
  }

  getConversationId() {
    return this.conversationId;
  }

  getIsLoading() {
    return this.isLoading;
  }

  setConversationId(id: string | null) {
    this.conversationId = id;
    this.notify();
  }

  setMessages(msgs: ChatMessage[]) {
    this.messages = msgs;
    this.notify();
  }

  clearMessages() {
    this.messages = [];
    this.conversationId = null;
    this.notify();
  }

  abort() {
    this.abortController?.abort();
    this.isLoading = false;
    this.notify();
  }

  async sendMessage(message: string, modelId: string) {
    if (!message.trim() || this.isLoading) return;

    // Abort any existing stream
    this.abortController?.abort();
    this.abortController = new AbortController();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim(),
    };

    const assistantId = crypto.randomUUID();
    this.messages = [
      ...this.messages,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ];
    this.isLoading = true;
    this.notify();

    let streamContent = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: this.conversationId,
          modelId,
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "meta" && event.conversationId) {
              this.conversationId = event.conversationId;
            } else if (event.type === "status") {
              this.updateMessage(assistantId, {
                content: `🔍 ${event.content}`,
              });
            } else if (event.type === "flight_results") {
              try {
                const results = JSON.parse(event.content);
                this.updateMessage(assistantId, {
                  flightResults: results,
                  content: "",
                });
              } catch {
                /* skip parse errors */
              }
            } else if (event.type === "text") {
              streamContent += event.content;
              this.updateMessage(assistantId, { content: streamContent });
            } else if (event.type === "done") {
              this.updateMessage(assistantId, { modelUsed: modelId });
            } else if (event.type === "error") {
              this.updateMessage(assistantId, {
                content: `⚠️ Error: ${event.content}`,
              });
            }
          } catch {
            /* skip non-JSON */
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        this.updateMessage(assistantId, {
          content: `⚠️ Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    } finally {
      this.isLoading = false;
      this.abortController = null;
      this.notify();
    }
  }

  private updateMessage(id: string, updates: Partial<ChatMessage>) {
    this.messages = this.messages.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    );
    this.notify();
  }
}

// Singleton — persists across navigation
export const chatStore = new ChatStore();
