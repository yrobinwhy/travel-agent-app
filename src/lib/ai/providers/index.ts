import { anthropicProvider } from "./anthropic";
import { googleProvider } from "./google";
import type { LLMProvider, ModelConfig } from "./types";

export { AVAILABLE_MODELS, DEFAULT_MODEL_ID, getModelById, getModelsByProvider } from "./types";
export type { ChatMessage, ModelConfig, StreamChunk, CompletionOptions, CompletionResult, LLMProvider } from "./types";

export function getProvider(model: ModelConfig): LLMProvider {
  switch (model.provider) {
    case "anthropic":
      return anthropicProvider;
    case "google":
      return googleProvider;
    case "openai":
      throw new Error("OpenAI provider not yet configured. Add your API key in settings.");
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}
