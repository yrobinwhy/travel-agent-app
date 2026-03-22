import type { LLMProvider, ModelConfig } from "./types";

export { AVAILABLE_MODELS, DEFAULT_MODEL_ID, getModelById, getModelsByProvider } from "./types";
export type { ChatMessage, ModelConfig, StreamChunk, CompletionOptions, CompletionResult, LLMProvider } from "./types";

export async function getProvider(model: ModelConfig): Promise<LLMProvider> {
  switch (model.provider) {
    case "anthropic": {
      const { anthropicProvider } = await import("./anthropic");
      return anthropicProvider;
    }
    case "google": {
      const { googleProvider } = await import("./google");
      return googleProvider;
    }
    case "openai":
      throw new Error("OpenAI provider not yet configured. Add your API key in settings.");
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}
