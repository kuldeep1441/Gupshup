import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { z } from "zod";

type StoredChat = Chat;

/**
 * API route handler for removing a member from a chat.
 * Only allows removal if the chat has more than 2 members.
 */
export async function POST(req: Request) {
  try {
    const {
      chatId,
      memberId,
    }: {
      chatId: string;
      memberId: string;
    } = await req.json();

    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const requesterId = session.user.id;

    if (!chatId || !memberId) {
      return new Response("chatId and memberId are required.", {
        status: 400,
      });
    }

    const existingChatRaw = (await fetchRedis(
      "get",
      `chat:${chatId}`
    )) as string | null;

    if (!existingChatRaw) {
      return new Response("Chat not found.", { status: 404 });
    }

    const chat = JSON.parse(existingChatRaw) as StoredChat;

    if (!chat.memberIds.includes(requesterId)) {
      return new Response("Only chat members can remove participants.", {
        status: 401,
      });
    }

    // Prevent removing from 2-person chats that are individual chats (not groups)
    // A chat is an individual chat if it has 2 members AND is named "Direct message"
    // Groups can have any number of members (including 1 or 2) and should always remain groups
    const isIndividualChat = chat.memberIds.length === 2 && chat.name === "Direct message";
    if (isIndividualChat) {
      return new Response(
        "Cannot remove members from a direct message chat. Use remove friend instead.",
        { status: 400 }
      );
    }
    
    // Prevent removing the last member (groups must have at least 1 member)
    if (chat.memberIds.length <= 1) {
      return new Response(
        "Cannot remove the last member from a group.",
        { status: 400 }
      );
    }

    if (!chat.memberIds.includes(memberId)) {
      return new Response("User is not a member of this chat.", {
        status: 400,
      });
    }

    // Prevent removing yourself
    if (memberId === requesterId) {
      return new Response("You cannot remove yourself from the chat.", {
        status: 400,
      });
    }

    const updatedChat: StoredChat = {
      ...chat,
      memberIds: chat.memberIds.filter((id) => id !== memberId),
    };

    // Update chat and remove from user's chat list
    await Promise.all([
      db.set(`chat:${updatedChat.id}`, JSON.stringify(updatedChat)),
      db.srem(`user:${memberId}:chats`, chatId),
      // Notify the removed member
      pusherServer.trigger(
        toPusherKey(`user:${memberId}:chats`),
        "removed_from_chat",
        {
          chatId,
          chatName: chat.name,
        }
      ),
      // Notify all remaining members
      pusherServer.trigger(
        toPusherKey(`chat:${chatId}`),
        "member_removed",
        {
          memberId,
          chat: updatedChat,
        }
      ),
      // Notify all remaining chat members to refresh their chat list
      ...updatedChat.memberIds.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:chats`),
          "chat_updated",
          {
            chatId: updatedChat.id,
            chat: updatedChat,
          }
        )
      ),
    ]);

    return new Response(JSON.stringify(updatedChat), {
      status: 200,
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

