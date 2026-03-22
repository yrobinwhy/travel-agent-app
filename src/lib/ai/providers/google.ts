import type {
  LLMProvider,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "./types";

async function getGenAI() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables");
  }
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  return new GoogleGenerativeAI(apiKey);
}

export const googleProvider: LLMProvider = {
  async chat(options: CompletionOptions): Promise<CompletionResult> {
    const genAI = await getGenAI();
    const { model, messages, systemPrompt, maxTokens, temperature } = options;

    const geminiModel = genAI.getGenerativeModel({
      model: model.apiModelId,
      ...(systemPrompt && { systemInstruction: systemPrompt }),
      generationConfig: {
        maxOutputTokens: maxTokens || model.maxTokens,
        ...(temperature !== undefined && { temperature }),
      },
      tools: [{ googleSearch: {} } as any],
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text(),
      model: model.apiModelId,
      tokensUsed:
        (response.usageMetadata?.promptTokenCount || 0) +
        (response.usageMetadata?.candidatesTokenCount || 0),
    };
  },

  async *chatStream(
    options: CompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const genAI = await getGenAI();
    const { model, messages, systemPrompt, maxTokens, temperature } = options;

    const geminiModel = genAI.getGenerativeModel({
      model: model.apiModelId,
      ...(systemPrompt && { systemInstruction: systemPrompt }),
      generationConfig: {
        maxOutputTokens: maxTokens || model.maxTokens,
        ...(temperature !== undefined && { temperature }),
      },
      tools: [{ googleSearch: {} } as any],
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    try {
      const chat = geminiModel.startChat({ history });
      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { type: "text", content: text };
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
