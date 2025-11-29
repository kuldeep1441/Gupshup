import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";

type StoredChat = Chat;

export async function POST(req: Request) {
  try {
    const {
      chatId,
      name,
    }: {
      chatId: string;
      name: string;
    } = await req.json();

    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const requesterId = session.user.id;

    if (!chatId) {
      return new Response("chatId is required.", { status: 400 });
    }

    const trimmedName = name?.trim();

    if (!trimmedName) {
      return new Response("Chat name cannot be empty.", { status: 400 });
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
      return new Response("Only chat members can rename the chat.", {
        status: 401,
      });
    }

    const updatedChat: StoredChat = {
      ...chat,
      name: trimmedName,
    };

    await Promise.all([
      db.set(`chat:${updatedChat.id}`, JSON.stringify(updatedChat)),
      // Notify all chat members about the name change
      pusherServer.trigger(
        toPusherKey(`chat:${chat.id}`),
        "chat_name_updated",
        {
          chatId: updatedChat.id,
          chat: updatedChat,
        }
      ),
      // Notify all members to refresh their chat list
      ...chat.memberIds.map((memberId) =>
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


