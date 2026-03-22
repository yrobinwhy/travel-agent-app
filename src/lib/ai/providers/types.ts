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
  type: "text" | "error" | "done";
  content: string;
}

export interface CompletionOptions {
  model: ModelConfig;
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
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
  {
    id: "claude-sonnet",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    apiModelId: "claude-sonnet-4-20250514",
    maxTokens: 8192,
    description: "Best for travel planning, reasoning, and complex itineraries",
    bestFor: "reasoning",
  },
  {
    id: "claude-haiku",
    displayName: "Claude Haiku 3.5",
    provider: "anthropic",
    apiModelId: "claude-3-5-haiku-20241022",
    maxTokens: 8192,
    description: "Fast responses for quick queries and intent parsing",
    bestFor: "fast",
  },
  {
    id: "gemini-flash",
    displayName: "Gemini 2.0 Flash",
    provider: "google",
    apiModelId: "gemini-2.0-flash",
    maxTokens: 8192,
    description: "Great for web search grounding and flight data lookups",
    bestFor: "search",
  },
  {
    id: "gemini-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    apiModelId: "gemini-2.5-pro-preview-05-06",
    maxTokens: 8192,
    description: "Advanced reasoning with search grounding capabilities",
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
