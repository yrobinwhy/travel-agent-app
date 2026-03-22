import type {
  LLMProvider,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "./types";

let _client: InstanceType<typeof import("@anthropic-ai/sdk").default> | null = null;

async function getClient() {
  if (!_client) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _client;
}

export const anthropicProvider: LLMProvider = {
  async chat(options: CompletionOptions): Promise<CompletionResult> {
    const client = await getClient();
    const { model, messages, systemPrompt, maxTokens, temperature } = options;

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await client.messages.create({
      model: model.apiModelId,
      max_tokens: maxTokens || model.maxTokens,
      ...(temperature !== undefined && { temperature }),
      ...(systemPrompt && { system: systemPrompt }),
      messages: anthropicMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");

    return {
      content: textBlock?.text || "",
      model: model.apiModelId,
      tokensUsed:
        (response.usage?.input_tokens || 0) +
        (response.usage?.output_tokens || 0),
    };
  },

  async *chatStream(
    options: CompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const client = await getClient();
    const { model, messages, systemPrompt, maxTokens, temperature } = options;

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    try {
      const stream = client.messages.stream({
        model: model.apiModelId,
        max_tokens: maxTokens || model.maxTokens,
        ...(temperature !== undefined && { temperature }),
        ...(systemPrompt && { system: systemPrompt }),
        messages: anthropicMessages,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "text", content: event.delta.text };
        }
      }

      yield { type: "done", content: "" };
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
