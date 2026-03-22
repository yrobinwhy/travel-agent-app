import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema/intelligence";
import { getProvider, getModelById, DEFAULT_MODEL_ID } from "@/lib/ai/providers";
import { TRAVEL_CONCIERGE_SYSTEM_PROMPT } from "@/lib/ai/prompts/system";
import { eq, asc } from "drizzle-orm";
import type { ChatMessage } from "@/lib/ai/providers";

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

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let totalTokens = 0;

      try {
        // Send conversation ID first
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "meta", conversationId: convId })}\n\n`
          )
        );

        const gen = provider.chatStream({
          model,
          messages: chatMessages,
          systemPrompt: TRAVEL_CONCIERGE_SYSTEM_PROMPT,
          stream: true,
        });

        for await (const chunk of gen) {
          if (chunk.type === "text") {
            fullContent += chunk.content;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: chunk.content })}\n\n`
              )
            );
          } else if (chunk.type === "error") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", content: chunk.content })}\n\n`
              )
            );
          } else if (chunk.type === "done") {
            // Save assistant message
            await db.insert(messages).values({
              conversationId: convId!,
              role: "assistant",
              content: fullContent,
              modelUsed: model.apiModelId,
              tokensUsed: totalTokens || null,
            });

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", conversationId: convId })}\n\n`
              )
            );
          }
        }
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: errMsg })}\n\n`
          )
        );
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
    // Load messages for a conversation
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    return Response.json({ messages: msgs });
  }

  // List all conversations
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(asc(conversations.createdAt));

  // Return newest first
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
    // Delete all conversations for this user
    // Messages cascade-delete via FK
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, session.user.id));

    for (const conv of userConvs) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
      await db.delete(conversations).where(eq(conversations.id, conv.id));
    }

    return Response.json({ deleted: userConvs.length });
  }

  if (convId) {
    // Verify ownership
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

  return Response.json({ error: "Provide conversationId or all=true" }, { status: 400 });
}
