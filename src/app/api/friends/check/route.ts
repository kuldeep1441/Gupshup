import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

/**
 * API route handler for checking if a user is a friend.
 * Returns whether the specified user is in the current user's friends list.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const friendId = searchParams.get("id");

    if (!friendId) {
      return new Response("Friend ID is required", { status: 400 });
    }

    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isFriend = (await fetchRedis(
      "sismember",
      `user:${session.user.id}:friends`,
      friendId
    )) as 0 | 1;

    return new Response(
      JSON.stringify({ isFriend: isFriend === 1 }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}

