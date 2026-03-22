import type {
  LLMProvider,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "./types";

async function getClient() {
  // Use CLAUDE_API_KEY to avoid collision with shell env ANTHROPIC_API_KEY
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
    const { model, messages, systemPrompt, maxTokens, temperature, tools } =
      options;

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    try {
      // If tools are provided, use non-streaming tool use first
      if (tools && tools.length > 0) {
        const response = await client.messages.create({
          model: model.apiModelId,
          max_tokens: maxTokens || model.maxTokens,
          ...(temperature !== undefined && { temperature }),
          ...(systemPrompt && { system: systemPrompt }),
          messages: anthropicMessages,
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as { type: "object"; properties?: Record<string, unknown>; required?: string[] },
          })),
        });

        // Check if model wants to use a tool
        const toolUseBlock = response.content.find(
          (b) => b.type === "tool_use"
        );

        if (toolUseBlock && toolUseBlock.type === "tool_use") {
          // Signal tool call to the chat handler
          yield {
            type: "tool_call" as StreamChunk["type"],
            content: JSON.stringify({
              toolName: toolUseBlock.name,
              toolInput: toolUseBlock.input,
              toolUseId: toolUseBlock.id,
            }),
          };
          return;
        }

        // No tool call — return text content
        for (const block of response.content) {
          if (block.type === "text") {
            yield { type: "text", content: block.text };
          }
        }
        yield { type: "done", content: "" };
        return;
      }

      // Standard streaming (no tools)
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
