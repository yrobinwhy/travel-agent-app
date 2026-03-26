import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rl = await rateLimit(session.user.id, "api", RATE_LIMITS.api);
  if (!rl.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase().trim();

  if (!email || email.length < 3) {
    return Response.json({ found: false });
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.email, email));

  if (user) {
    // Only return display info, never internal IDs
    return Response.json({ found: true, name: user.name, image: user.image });
  }

  return Response.json({ found: false });
}
