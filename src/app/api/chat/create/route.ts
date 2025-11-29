import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";

type StoredChat = Chat;

export async function POST(req: Request) {
  try {
    const {
      name,
      memberIds,
    }: {
      name?: string | null;
      memberIds: string[];
    } = await req.json();

    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const requesterId = session.user.id;

    if (!Array.isArray(memberIds) || memberIds.length < 1) {
      return new Response("A chat must have at least one member.", {
        status: 400,
      });
    }

    if (!memberIds.includes(requesterId)) {
      return new Response("Requester must be a member of the chat.", {
        status: 400,
      });
    }

    const trimmedName = name?.trim() ?? "";

    if (memberIds.length > 2 && trimmedName.length === 0) {
      return new Response("Group name is required for chats with more than 2 members.", {
        status: 400,
      });
    }

    const finalName =
      memberIds.length === 2 && trimmedName.length === 0
        ? "Direct message"
        : trimmedName;

    // Optional: ensure all members are friends with requester for 1-to-1 chats.
    if (memberIds.length === 2) {
      const otherId = memberIds.find((id) => id !== requesterId);

      if (otherId) {
        const friendList = (await fetchRedis(
          "smembers",
          `user:${requesterId}:friends`
        )) as string[];

        if (!friendList.includes(otherId)) {
          return new Response("Cannot create a direct message with a non-friend.", {
            status: 401,
          });
        }
      }
    }

    const chatId = nanoid();
    const createdAt = Date.now();

    const chat: StoredChat = {
      id: chatId,
      name: finalName,
      memberIds,
      createdAt, // Store creation timestamp for groups
    };

    await db.set(`chat:${chat.id}`, JSON.stringify(chat));

    // Associate chat with all members
    await Promise.all(
      memberIds.map((memberId) =>
        db.sadd(`user:${memberId}:chats`, chat.id)
      )
    );

    // Notify all OTHER members (excluding the creator) that they've been added to a new group
    const otherMemberIds = memberIds.filter((id) => id !== requesterId);
    
    await Promise.all([
      // Notify other members that they've been added to a new group
      ...otherMemberIds.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:chats`),
          "added_to_chat",
          {
            chatId: chat.id,
            chat,
          }
        )
      ),
      // Also trigger chat_created event for real-time updates (only for other members)
      ...otherMemberIds.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:chats`),
          "chat_created",
          chat
        )
      ),
      // For the creator, only trigger chat_created to update the UI without showing toast
      pusherServer.trigger(
        toPusherKey(`user:${requesterId}:chats`),
        "chat_created",
        chat
      ),
    ]);

    return new Response(JSON.stringify(chat), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}


