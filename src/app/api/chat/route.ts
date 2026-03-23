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
import { ALL_TRIP_TOOLS } from "@/lib/ai/tools/trip-tools";
import { searchFlights } from "@/lib/flights";
import type { FlightSearchResult } from "@/lib/flights";
import { createTripFromChat, addSegmentToTrip, addBookingToTrip } from "@/lib/db/queries/trips";
import { eq, asc, desc } from "drizzle-orm";
import type { ChatMessage } from "@/lib/ai/providers";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Vercel serverless function config — extend timeout for flight searches
export const maxDuration = 60; // seconds

// Max messages to load for context (prevents memory spike on long conversations)
const MAX_HISTORY_MESSAGES = 50;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

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

  // Rate limit (async for Redis support)
  const rl = await rateLimit(userId, "chat", RATE_LIMITS.chat);
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many messages. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  if (!message?.trim()) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 10000) {
    return Response.json({ error: "Message too long (max 10,000 characters)" }, { status: 400 });
  }

  const model = getModelById(modelId);
  if (!model) {
    return Response.json({ error: "Invalid model" }, { status: 400 });
  }

  const provider = await getProvider(model);

  // Get or create conversation — verify ownership if existing
  let convId = conversationId;
  if (convId) {
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, convId));
    if (!existingConv || existingConv.userId !== userId) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    const [newConv] = await db
      .insert(conversations)
      .values({
        userId: userId,
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

  // Load conversation history (paginated — last N messages for context window)
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);

  // Reverse to chronological order
  const chatMessages: ChatMessage[] = history.reverse().map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Only provide tools for Claude (Anthropic)
  const tools =
    model.provider === "anthropic"
      ? [FLIGHT_SEARCH_TOOL, ...ALL_TRIP_TOOLS]
      : undefined;

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
          }
        }

        if (hasToolCalls) {
          // Process trip management tools first (create_trip, add_flight, add_hotel)
          const tripCalls = toolCalls.filter(
            (tc) => tc.toolName === "create_trip"
          );
          const addFlightCalls = toolCalls.filter(
            (tc) => tc.toolName === "add_flight_to_trip"
          );
          const addHotelCalls = toolCalls.filter(
            (tc) => tc.toolName === "add_hotel_to_trip"
          );

          // Handle create_trip
          for (const tc of tripCalls) {
            try {
              const input = tc.toolInput;
              const trip = await createTripFromChat({
                title: input.title as string,
                destinationCity: input.destinationCity as string | undefined,
                destinationCountry: input.destinationCountry as string | undefined,
                startDate: input.startDate as string | undefined,
                endDate: input.endDate as string | undefined,
                conversationId: convId,
                userId: userId,
              });
              send({
                type: "trip_created",
                content: JSON.stringify({ tripId: trip.id, title: trip.title }),
              });
              // Store tripId for subsequent add_flight/add_hotel calls
              fullContent += `\n[Trip created: ${trip.title} (ID: ${trip.id})]`;
            } catch {
              send({ type: "status", content: "Could not create trip automatically." });
            }
          }

          // Handle add_flight_to_trip
          for (const tc of addFlightCalls) {
            try {
              const input = tc.toolInput;
              await addSegmentToTrip({
                tripId: input.tripId as string,
                type: "flight",
                title: `${input.carrier || ""} ${input.flightNumber || ""} · ${input.origin} → ${input.destination}`.trim(),
                carrier: input.carrier as string | undefined,
                flightNumber: input.flightNumber as string | undefined,
                origin: input.origin as string,
                destination: input.destination as string,
                cabinClass: input.cabinClass as string | undefined,
                startAt: input.departureTime ? new Date(input.departureTime as string) : undefined,
                endAt: input.arrivalTime ? new Date(input.arrivalTime as string) : undefined,
                details: { price: input.price, currency: input.currency },
              });
              if (input.price) {
                await addBookingToTrip({
                  tripId: input.tripId as string,
                  userId: userId,
                  type: "flight",
                  vendorName: input.carrier as string | undefined,
                  totalCost: input.price as number | undefined,
                  currency: (input.currency as string) || "USD",
                  status: "draft",
                });
              }
              send({ type: "status", content: `Flight added to trip.` });
            } catch {
              send({ type: "status", content: "Could not add flight to trip." });
            }
          }

          // Handle add_hotel_to_trip
          for (const tc of addHotelCalls) {
            try {
              const input = tc.toolInput;
              await addSegmentToTrip({
                tripId: input.tripId as string,
                type: "hotel_night",
                title: input.hotelName as string,
                locationName: input.hotelName as string,
                locationAddress: input.address as string | undefined,
                startAt: input.checkIn ? new Date(input.checkIn as string) : undefined,
                endAt: input.checkOut ? new Date(input.checkOut as string) : undefined,
                details: { price: input.price, currency: input.currency },
              });
              if (input.price) {
                await addBookingToTrip({
                  tripId: input.tripId as string,
                  userId: userId,
                  type: "hotel",
                  vendorName: input.hotelName as string,
                  totalCost: input.price as number | undefined,
                  currency: (input.currency as string) || "USD",
                  status: "draft",
                  checkInAt: input.checkIn ? new Date(input.checkIn as string) : undefined,
                  checkOutAt: input.checkOut ? new Date(input.checkOut as string) : undefined,
                });
              }
              send({ type: "status", content: `Hotel added to trip.` });
            } catch {
              send({ type: "status", content: "Could not add hotel to trip." });
            }
          }

          // Process flight search tool calls
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
              try {
                return await searchFlights(params);
              } catch (err) {
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
          } else {
            // Trip tools were called but no flight search — save what we have
            if (fullContent) {
              await db.insert(messages).values({
                conversationId: convId!,
                role: "assistant",
                content: fullContent,
                modelUsed: model.apiModelId,
                toolCalls: {
                  tripActions: {
                    created: tripCalls.length,
                    flightsAdded: addFlightCalls.length,
                    hotelsAdded: addHotelCalls.length,
                  },
                },
              });
            }
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
  const userId = session.user.id;

  // Rate limit reads
  const rl = await rateLimit(userId, "chatRead", RATE_LIMITS.chatRead);
  if (!rl.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const convId = searchParams.get("conversationId");

  if (convId) {
    // Verify ownership before returning messages
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, convId));
    if (!conv || conv.userId !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

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
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt))
    .limit(100); // Paginate conversations

  return Response.json({ conversations: convs });
}

// DELETE: Delete a conversation or all conversations
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  // Rate limit deletes
  const rl = await rateLimit(userId, "chatDelete", RATE_LIMITS.chatDelete);
  if (!rl.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const convId = searchParams.get("conversationId");
  const all = searchParams.get("all");

  if (all === "true") {
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId));

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

    if (!conv || conv.userId !== userId) {
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
