import type {
  LLMProvider,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "./types";

async function getClient() {
  // Use CLAUDE_API_KEY to avoid collision with shell env ANTHROPIC_API_KEY
  // (Claude Code sets ANTHROPIC_API_KEY="" in the shell, Next.js won't override it)
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY is not set in environment variables");
  }
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return new Anthropic({ apiKey });
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
