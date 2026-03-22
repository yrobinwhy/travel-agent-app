// Unified types for multi-model LLM abstraction

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: "anthropic" | "google" | "openai";
  apiModelId: string; // The actual model ID sent to the provider
  maxTokens: number;
  description: string;
  bestFor: string; // "general", "search", "reasoning", "fast"
}

export interface StreamChunk {
  type: "text" | "error" | "done" | "tool_call" | "flight_results";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface CompletionOptions {
  model: ModelConfig;
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface CompletionResult {
  content: string;
  model: string;
  tokensUsed: number;
}

export interface LLMProvider {
  chat(options: CompletionOptions): Promise<CompletionResult>;
  chatStream(
    options: CompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;
}

// Available models - add new ones here
export const AVAILABLE_MODELS: ModelConfig[] = [
  // ── Anthropic ──
  {
    id: "claude-sonnet",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    apiModelId: "claude-sonnet-4-6",
    maxTokens: 16384,
    description: "Best for travel planning, reasoning, and complex itineraries",
    bestFor: "reasoning",
  },
  {
    id: "claude-haiku",
    displayName: "Claude Haiku 4.5",
    provider: "anthropic",
    apiModelId: "claude-haiku-4-5-20251001",
    maxTokens: 8192,
    description: "Fast responses for quick queries and intent parsing",
    bestFor: "fast",
  },
  // ── Google ──
  {
    id: "gemini-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    apiModelId: "gemini-2.5-flash",
    maxTokens: 8192,
    description: "Fast reasoning with search grounding for flight lookups",
    bestFor: "search",
  },
  {
    id: "gemini-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    provider: "google",
    apiModelId: "gemini-2.5-flash-lite",
    maxTokens: 8192,
    description: "Fastest and most cost-effective for high-volume queries",
    bestFor: "fast",
  },
  {
    id: "gemini-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    apiModelId: "gemini-2.5-pro",
    maxTokens: 8192,
    description: "Deep reasoning and complex problem solving with search",
    bestFor: "reasoning",
  },
];

export const DEFAULT_MODEL_ID = "claude-sonnet";

export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(
  provider: string
): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}
