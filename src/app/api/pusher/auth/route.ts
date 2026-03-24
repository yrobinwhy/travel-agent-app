import { auth } from "@/lib/auth";
import { getPusher } from "@/lib/pusher/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return new Response("Missing parameters", { status: 400 });
  }

  const pusher = getPusher();

  // Presence channels require user info
  if (channelName.startsWith("presence-")) {
    const authResponse = pusher.authorizeChannel(socketId, channelName, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name || session.user.email || "Unknown",
        email: session.user.email || "",
        image: session.user.image || "",
      },
    });
    return Response.json(authResponse);
  }

  // Private channels
  if (channelName.startsWith("private-")) {
    // Verify user can only subscribe to their own channel
    const expectedChannel = `private-user-${session.user.id}`;
    if (channelName !== expectedChannel) {
      return new Response("Forbidden", { status: 403 });
    }
    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return Response.json(authResponse);
  }

  return new Response("Invalid channel", { status: 400 });
}
