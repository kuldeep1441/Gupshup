import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { Message, messageValidator } from "@/lib/validations/message";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";

type StoredChat = Chat;

export async function POST(req: Request) {
  try {
    const { text, chatId }: { text: string; chatId: string } = await req.json();
    const session = await getServerSession(authOptions);

    if (!session) return new Response("Unauthorized", { status: 401 });

    const senderId = session.user.id;

    // Load chat information. If it does not exist yet, fall back to the
    // historical 1-to-1 chat id format "userA--userB" and create a group
    // chat with those two members.
    const existingChatRaw = (await fetchRedis(
      "get",
      `chat:${chatId}`
    )) as string | null;

    let chat: StoredChat;

    if (!existingChatRaw) {
      const [userId1, userId2] = chatId.split("--");

      // Ensure the current user is one of the participants.
      if (senderId !== userId1 && senderId !== userId2) {
        return new Response("Unauthorized", { status: 401 });
      }

      const otherParticipantId = senderId === userId1 ? userId2 : userId1;

      // Still enforce friendship for the initial creation of a 1-to-1 chat.
      const friendList = (await fetchRedis(
        "smembers",
        `user:${senderId}:friends`
      )) as string[];
      const isFriend = friendList.includes(otherParticipantId);

      if (!isFriend) {
        return new Response("Unauthorized", { status: 401 });
      }

      chat = {
        id: chatId,
        name: "Direct message",
        memberIds: [userId1, userId2],
      };

      // Persist the chat metadata and associate it with each user so that
      // we can later extend this to arbitrary-sized groups.
      await db.set(`chat:${chat.id}`, JSON.stringify(chat));
      await db.sadd(`user:${userId1}:chats`, chat.id);
      await db.sadd(`user:${userId2}:chats`, chat.id);
    } else {
      chat = JSON.parse(existingChatRaw) as StoredChat;

      if (!chat.memberIds.includes(senderId)) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const rawSender = (await fetchRedis(
      "get",
      `user:${senderId}`
    )) as string;
    const sender = JSON.parse(rawSender) as User;

    const timestamp = Date.now();

    const messageData: Message = {
      id: nanoid(),
      chatId: chat.id,
      senderId,
      text,
      timestamp,
    };

    const message = messageValidator.parse(messageData);

    // Save message to Redis first
    await db.zadd(`chat:${chat.id}:messages`, {
      score: timestamp,
      member: JSON.stringify(message),
    });

    // Then notify all connected chat room clients (including sender)
    const pusherChannelName = toPusherKey(`chat:${chat.id}`);
    console.log(`[API] Triggering Pusher event on channel: ${pusherChannelName} for chatId: ${chat.id}`);
    console.log(`[API] Message payload:`, {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      text: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
      timestamp: message.timestamp,
    });
    console.log(`[API] Chat memberIds:`, chat.memberIds);
    let pusherSuccess = false;
    try {
      const result = await pusherServer.trigger(
        pusherChannelName,
        "incoming-message",
        message
      );
      console.log(`[API] ✅ Successfully triggered Pusher event on channel: ${pusherChannelName}`, result);
      pusherSuccess = true;
    } catch (pusherError: any) {
      console.error(`[API] ❌ Error triggering Pusher event on channel ${pusherChannelName}:`, pusherError);
      
      // Check for quota exceeded error
      const errorCode = pusherError?.status || pusherError?.code || pusherError?.data?.code;
      const errorMessage = pusherError?.message || pusherError?.data?.message || "";
      
      if (errorCode === 4004 || errorMessage.includes("over quota") || errorMessage.includes("quota")) {
        console.error(`[API] ⚠️ PUSHER QUOTA EXCEEDED (Code: 4004)`);
        console.error(`[API] Message saved to Redis but real-time delivery failed. User will see message on page refresh.`);
        // Message is already saved to Redis, so it's not lost
        // Return success but log the quota error for monitoring
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Message saved but real-time delivery unavailable due to quota limits",
          pusherQuotaExceeded: true 
        }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // For other Pusher errors, still return success since message is saved
      // Continue even if Pusher fails - message is already saved to Redis
      // This ensures messages aren't lost even if Pusher is down
    }

    // Notify all other members of this chat (group or 1-to-1) for sidebar updates
    // Only if the main channel trigger was successful (to avoid quota issues)
    if (pusherSuccess) {
      const otherMemberIds = chat.memberIds.filter((id) => id !== senderId);

      try {
        await Promise.all(
          otherMemberIds.map((memberId) =>
            pusherServer.trigger(
              toPusherKey(`user:${memberId}:chats`),
              "new_message",
              {
                ...message,
                senderImg: sender.image,
                senderName: sender.name,
              }
            ).catch((err) => {
              // Silently fail sidebar notifications to avoid breaking message sending
              console.warn(`[API] Failed to notify sidebar for user ${memberId}:`, err);
            })
          )
        );
      } catch (sidebarError) {
        // Silently fail sidebar notifications to avoid breaking message sending
        console.warn(`[API] Failed to send sidebar notifications:`, sidebarError);
      }
    }

    return new Response("OK");
  } catch (error) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
