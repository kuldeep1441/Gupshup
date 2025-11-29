import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { messageValidator } from "@/lib/validations/message";
import { getServerSession } from "next-auth";
import { z } from "zod";

type StoredChat = Chat;

/**
 * API route handler for editing/updating a message.
 * Only allows the message sender to edit their own messages.
 */
export async function POST(req: Request) {
  try {
    const {
      messageId,
      chatId,
      text,
    }: {
      messageId: string;
      chatId: string;
      text: string;
    } = await req.json();

    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const senderId = session.user.id;

    if (!messageId || !chatId || !text) {
      return new Response("messageId, chatId, and text are required.", {
        status: 400,
      });
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return new Response("Message text cannot be empty.", {
        status: 400,
      });
    }

    // Load chat information
    const existingChatRaw = (await fetchRedis(
      "get",
      `chat:${chatId}`
    )) as string | null;

    if (!existingChatRaw) {
      return new Response("Chat not found.", { status: 404 });
    }

    const chat = JSON.parse(existingChatRaw) as StoredChat;

    if (!chat.memberIds.includes(senderId)) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get all messages for this chat
    const messages = (await fetchRedis(
      "zrange",
      `chat:${chatId}:messages`,
      0,
      -1
    )) as string[];

    // Find the message to edit
    const messageIndex = messages.findIndex((msg) => {
      const parsed = JSON.parse(msg) as Message;
      return parsed.id === messageId;
    });

    if (messageIndex === -1) {
      return new Response("Message not found.", { status: 404 });
    }

    const originalMessage = JSON.parse(messages[messageIndex]) as Message;

    // Only allow the sender to edit their own message
    if (originalMessage.senderId !== senderId) {
      return new Response("You can only edit your own messages.", {
        status: 403,
      });
    }

    // Create updated message
    const updatedMessage: Message = {
      ...originalMessage,
      text: trimmedText,
    };

    const validatedMessage = messageValidator.parse(updatedMessage);

    // Update the message in Redis
    await db.zrem(`chat:${chatId}:messages`, messages[messageIndex]);
    await db.zadd(`chat:${chatId}:messages`, {
      score: originalMessage.timestamp,
      member: JSON.stringify(validatedMessage),
    });

    // Notify all connected chat room clients
    await pusherServer.trigger(
      toPusherKey(`chat:${chatId}`),
      "message_edited",
      validatedMessage
    );

    // Notify all other members of this chat
    const otherMemberIds = chat.memberIds.filter((id) => id !== senderId);

    const rawSender = (await fetchRedis("get", `user:${senderId}`)) as string;
    const sender = JSON.parse(rawSender) as User;

    await Promise.all(
      otherMemberIds.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:chats`),
          "message_edited",
          {
            ...validatedMessage,
            senderImg: sender.image,
            senderName: sender.name,
          }
        )
      )
    );

    return new Response(JSON.stringify(validatedMessage), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}

