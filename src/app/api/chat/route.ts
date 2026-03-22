import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema/intelligence";
import {
  getProvider,
  getModelById,
  DEFAULT_MODEL_ID,
} from "@/lib/ai/providers";
import { TRAVEL_CONCIERGE_SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import {
  FLIGHT_SEARCH_TOOL,
  parseToolCall,
} from "@/lib/ai/tools/flight-search";
import { searchFlights } from "@/lib/flights";
import type { FlightSearchResult } from "@/lib/flights";
import { eq, asc } from "drizzle-orm";
import type { ChatMessage } from "@/lib/ai/providers";

// Vercel serverless function config — extend timeout for flight searches
export const maxDuration = 60; // seconds

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const {
    message,
    conversationId,
    modelId = DEFAULT_MODEL_ID,
  } = body as {
    message: string;
    conversationId?: string;
    modelId?: string;
  };

  if (!message?.trim()) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const model = getModelById(modelId);
  if (!model) {
    return Response.json({ error: "Invalid model" }, { status: 400 });
  }

  const provider = await getProvider(model);

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const [newConv] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        title: message.slice(0, 100),
        modelUsed: model.id,
      })
      .returning();
    convId = newConv.id;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  // Load conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt));

  const chatMessages: ChatMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Only provide tools for Claude (Anthropic)
  const tools =
    model.provider === "anthropic" ? [FLIGHT_SEARCH_TOOL] : undefined;

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";

      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send({ type: "meta", conversationId: convId });

        const gen = provider.chatStream({
          model,
          messages: chatMessages,
          systemPrompt: TRAVEL_CONCIERGE_SYSTEM_PROMPT,
          stream: true,
          tools,
        });

        // Collect all tool calls before processing
        const toolCalls: Array<{
          toolName: string;
          toolInput: Record<string, unknown>;
        }> = [];
        let hasToolCalls = false;

        for await (const chunk of gen) {
          if (chunk.type === ("tool_call" as string)) {
            hasToolCalls = true;
            const parsed = JSON.parse(chunk.content);
            toolCalls.push({
              toolName: parsed.toolName,
              toolInput: parsed.toolInput,
            });
          } else if (chunk.type === "text") {
            fullContent += chunk.content;
            send({ type: "text", content: chunk.content });
          } else if (chunk.type === "error") {
            send({ type: "error", content: chunk.content });
          } else if (chunk.type === "done") {
            // Will handle below
          }
        }

        if (hasToolCalls) {
          // Process all flight search tool calls in parallel
          const flightCalls = toolCalls.filter(
            (tc) => tc.toolName === "search_flights"
          );

          if (flightCalls.length > 0) {
            send({
              type: "status",
              content: `Searching ${flightCalls.length > 1 ? `${flightCalls.length} airports` : "flights"} across multiple providers...`,
            });

            // Execute all searches in parallel
            const searchPromises = flightCalls.map(async (tc) => {
              const params = parseToolCall(tc.toolInput);
              console.log("[FLIGHT SEARCH] Params:", JSON.stringify(params));
              try {
                return await searchFlights(params);
              } catch (err) {
                console.error("[FLIGHT SEARCH] Error:", err);
                return {
                  params,
                  offers: [],
                  searchedAt: new Date().toISOString(),
                  providers: [],
                  errors: [
                    {
                      provider: "all",
                      error:
                        err instanceof Error ? err.message : "Search failed",
                    },
                  ],
                } as FlightSearchResult;
              }
            });

            const allResults = await Promise.all(searchPromises);

            // Merge results from multiple searches
            const mergedResult: FlightSearchResult = {
              params: allResults[0].params,
              offers: allResults.flatMap((r) => r.offers),
              searchedAt: new Date().toISOString(),
              providers: [
                ...new Set(allResults.flatMap((r) => r.providers)),
              ],
              errors: allResults.flatMap((r) => r.errors || []),
            };

            // Sort merged offers by value
            mergedResult.offers.sort(
              (a, b) => (b.valueScore || 0) - (a.valueScore || 0)
            );

            // Compute metadata
            const prices = mergedResult.offers
              .map((o) => o.totalPrice)
              .filter((p) => p > 0);
            mergedResult.cheapestPrice = prices.length
              ? Math.min(...prices)
              : undefined;

            console.log(
              "[FLIGHT SEARCH] Merged:",
              mergedResult.offers.length,
              "offers from",
              mergedResult.providers.join(", ")
            );

            // Send flight results
            send({
              type: "flight_results",
              content: JSON.stringify(mergedResult),
            });

            // Ask LLM to summarize
            const topOffers = mergedResult.offers.slice(0, 8).map((o) => ({
              airlines: o.airlines.join(", "),
              price: `${o.currency} ${o.totalPrice}`,
              duration: o.totalDuration,
              stops: o.stops,
              valueScore: o.valueScore,
              valueNotes: o.valueNotes,
              refundable: o.refundable,
              changeable: o.changeable,
              bookable: o.bookable,
              outbound: o.outbound.map((s) => ({
                flight: s.flightNumber,
                from: `${s.originName} (${s.origin})`,
                to: `${s.destinationName} (${s.destination})`,
                depart: s.departureTime,
                arrive: s.arrivalTime,
                cabin: s.cabinClass,
              })),
            }));

            const summaryMessages: ChatMessage[] = [
              ...chatMessages,
              {
                role: "assistant",
                content: `I searched for flights and found ${mergedResult.offers.length} options. Here are the top results: ${JSON.stringify(topOffers)}${
                  mergedResult.errors?.length
                    ? `\n\nSome providers had errors: ${mergedResult.errors.map((e) => `${e.provider}: ${e.error}`).join(", ")}`
                    : ""
                }`,
              },
              {
                role: "user",
                content:
                  "Present these flight results clearly and concisely. Highlight the best value option and explain why. Include prices, airlines, times, and stops. Keep it conversational.",
              },
            ];

            const summaryGen = provider.chatStream({
              model,
              messages: summaryMessages,
              systemPrompt: TRAVEL_CONCIERGE_SYSTEM_PROMPT,
              stream: true,
              // No tools for summary
            });

            for await (const chunk of summaryGen) {
              if (chunk.type === "text") {
                fullContent += chunk.content;
                send({ type: "text", content: chunk.content });
              }
            }

            // Save assistant message
            await db.insert(messages).values({
              conversationId: convId!,
              role: "assistant",
              content: fullContent,
              modelUsed: model.apiModelId,
              toolCalls: {
                flightSearch: {
                  searchCount: flightCalls.length,
                  resultCount: mergedResult.offers.length,
                  providers: mergedResult.providers,
                  cheapest: mergedResult.cheapestPrice,
                },
              },
            });

            send({ type: "done", conversationId: convId });
          }
        } else {
          // No tool calls — save the streamed text
          if (fullContent) {
            await db.insert(messages).values({
              conversationId: convId!,
              role: "assistant",
              content: fullContent,
              modelUsed: model.apiModelId,
            });
          }
          send({ type: "done", conversationId: convId });
        }
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", content: errMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// GET: List conversations or load messages
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const convId = searchParams.get("conversationId");

  if (convId) {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    return Response.json({ messages: msgs });
  }

  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(asc(conversations.createdAt));

  return Response.json({ conversations: convs.reverse() });
}

// DELETE: Delete a conversation or all conversations
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const convId = searchParams.get("conversationId");
  const all = searchParams.get("all");

  if (all === "true") {
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, session.user.id));

    for (const conv of userConvs) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
      await db
        .delete(conversations)
        .where(eq(conversations.id, conv.id));
    }

    return Response.json({ deleted: userConvs.length });
  }

  if (convId) {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, convId));

    if (!conv || conv.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(messages).where(eq(messages.conversationId, convId));
    await db.delete(conversations).where(eq(conversations.id, convId));

    return Response.json({ deleted: 1 });
  }

  return Response.json(
    { error: "Provide conversationId or all=true" },
    { status: 400 }
  );
}
