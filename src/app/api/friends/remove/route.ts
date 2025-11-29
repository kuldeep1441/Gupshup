import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { z } from "zod";

/**
 * API route handler for removing a friend.
 * Removes the friendship from both users and notifies them via Pusher.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: idToRemove } = z.object({ id: z.string() }).parse(body);

    // Verify they are actually friends
    const isFriend = (await fetchRedis(
      "sismember",
      `user:${session.user.id}:friends`,
      idToRemove
    )) as 0 | 1;

    if (!isFriend) {
      return new Response("Not friends with this user", { status: 400 });
    }

    // Get the friend's user data to notify them
    const friendRaw = (await fetchRedis(
      "get",
      `user:${idToRemove}`
    )) as string | null;

    const friend = friendRaw ? (JSON.parse(friendRaw) as User) : null;

    // Remove from both users' friend lists
    await Promise.all([
      db.srem(`user:${session.user.id}:friends`, idToRemove),
      db.srem(`user:${idToRemove}:friends`, session.user.id),
      // Notify both users
      pusherServer.trigger(
        toPusherKey(`user:${session.user.id}:friends`),
        "friend_removed",
        idToRemove
      ),
      pusherServer.trigger(
        toPusherKey(`user:${idToRemove}:friends`),
        "friend_removed",
        session.user.id
      ),
    ]);

    return new Response("OK");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 422 });
    }

    return new Response("Invalid request", { status: 400 });
  }
}

