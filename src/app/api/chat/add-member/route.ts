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
      return new Response("Only chat members can add new participants.", {
        status: 401,
      });
    }

    if (chat.memberIds.includes(memberId)) {
      return new Response("User is already a member of this chat.", {
        status: 400,
      });
    }

    const trimmedName = chat.name.trim();

    // If chat would become a group (>2 members) enforce a non-empty name.
    if (chat.memberIds.length >= 2 && trimmedName.length === 0) {
      return new Response(
        "Group name is required before adding more members to this chat.",
        { status: 400 }
      );
    }

    const updatedChat: StoredChat = {
      ...chat,
      memberIds: [...chat.memberIds, memberId],
    };

    // Get the added member's user data for notifications
    const addedMemberRaw = (await fetchRedis(
      "get",
      `user:${memberId}`
    )) as string | null;
    const addedMember = addedMemberRaw ? (JSON.parse(addedMemberRaw) as User) : null;

    // Update chat and add to user's chat list
    await Promise.all([
      db.set(`chat:${updatedChat.id}`, JSON.stringify(updatedChat)),
      db.sadd(`user:${memberId}:chats`, updatedChat.id),
      // Notify the newly added member
      pusherServer.trigger(
        toPusherKey(`user:${memberId}:chats`),
        "added_to_chat",
        {
          chatId: updatedChat.id,
          chat: updatedChat,
        }
      ),
      // Notify all existing members about the new member
      pusherServer.trigger(
        toPusherKey(`chat:${chatId}`),
        "member_added",
        {
          memberId,
          member: addedMember,
          chat: updatedChat,
        }
      ),
      // Notify all chat members to refresh their chat list
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


