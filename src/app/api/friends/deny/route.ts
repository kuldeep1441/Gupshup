import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: idToDeny } = z.object({ id: z.string() }).parse(body);

    // Get the user who sent the request to notify them
    const requesterRaw = (await fetchRedis(
      "get",
      `user:${idToDeny}`
    )) as string | null;
    
    const requester = requesterRaw ? (JSON.parse(requesterRaw) as User) : null;

    // Notify the requester that their friend request was denied
    if (requester) {
      await pusherServer.trigger(
        toPusherKey(`user:${idToDeny}:friend_requests`),
        "friend_request_denied",
        {
          deniedById: session.user.id,
          deniedByName: session.user.name,
        }
      );
    }

    await db.srem(`user:${session.user.id}:incoming_friend_requests`, idToDeny);

    return new Response("OK");
  } catch (error) {
    // console.log(error);

    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 422 });
    }

    return new Response("Invalid request", { status: 400 });
  }
}
