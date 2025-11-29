import ChatWrapper from "@/components/ChatWrapper";
import GroupChatMembers from "@/components/GroupChatMembers";
import { fetchRedis } from "@/helpers/redis";
import { getFriendsByUserId } from "@/helpers/get-friends-by-user-id";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { messageArrayValidator } from "@/lib/validations/message";
import { getServerSession } from "next-auth";
import Image from "next/image";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    chatId: string;
  };
}

async function getChatMessages(chatId: string) {
  try {
    const results: string[] = await fetchRedis(
      "zrange",
      `chat:${chatId}:messages`,
      0,
      -1
    );

    const dbMessages = results.map((message) => JSON.parse(message) as Message);

    const reversedDbMessages = dbMessages.reverse();

    const messages = messageArrayValidator.parse(reversedDbMessages);

    return messages;
  } catch (error) {
    notFound();
  }
}

const page = async ({ params }: PageProps) => {
  const { chatId } = params;
  console.log('check', chatId)
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const { user } = session;

  // Load chat metadata (group/DM). If it does not exist yet but the id
  // is in the historical "userA--userB" format, bootstrap a direct-message
  // style chat with those two members.
  const existingChatRaw = (await fetchRedis(
    "get",
    `chat:${chatId}`
  )) as string | null;

  let chat: Chat;

  if (!existingChatRaw) {
    const [userId1, userId2] = chatId.split("--");

    if (user.id !== userId1 && user.id !== userId2) {
      notFound();
    }

    chat = {
      id: chatId,
      name: "Direct message",
      memberIds: [userId1, userId2],
    };

    await db.set(`chat:${chat.id}`, JSON.stringify(chat));
    await db.sadd(`user:${userId1}:chats`, chat.id);
    await db.sadd(`user:${userId2}:chats`, chat.id);
  } else {
    chat = JSON.parse(existingChatRaw) as Chat;

    if (!chat.memberIds.includes(user.id)) {
      notFound();
    }
  }

  // Load all participants for this chat so the UI can show correct avatars
  // for group messages.
  const participants = await Promise.all(
    chat.memberIds.map(async (memberId) => {
      const raw = (await fetchRedis("get", `user:${memberId}`)) as string;
      return JSON.parse(raw) as User;
    })
  );

  // Determine if it's a group chat: either has more than 2 members OR has a custom name (not "Direct message")
  // This ensures groups remain groups even if members are removed down to 2 or 1
  const isGroupChat = participants.length > 2 || (participants.length >= 1 && chat.name !== "Direct message");
  const isTwoPersonChat = participants.length === 2 && chat.name === "Direct message";
  const chatPartner =
    isTwoPersonChat && participants.find((p) => p.id !== user.id);

  // Fetch friends list for add/remove functionality (for both 2-person and group chats)
  const friends = await getFriendsByUserId(user.id);

  const initialMessages = await getChatMessages(chatId);

  return (
    <div className="flex-1 justify-between flex flex-col h-full">
      <div className="flex sm:items-center justify-between py-3 border-b-2 border-gray-200">
        <div className="relative flex items-center space-x-4">
          {isTwoPersonChat && chatPartner ? (
            <>
              <div className="relative">
                <div className="relative w-8 sm:w-12 h-8 sm:h-12">
                  <Image
                    fill
                    referrerPolicy="no-referrer"
                    src={chatPartner.image}
                    alt={`${chatPartner.name} profile picture`}
                    className="rounded-full"
                  />
                </div>
              </div>

              <div className="flex flex-col leading-tight">
                <div className="text-xl flex items-center">
                  <span className="text-gray-700 mr-3 font-semibold">
                    {chatPartner.name}
                  </span>
                </div>

                <span className="text-sm text-gray-600">
                  {chatPartner.email}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col leading-tight">
              <div className="text-xl flex items-center">
                <span className="text-gray-700 mr-3 font-semibold">
                  {chat.name}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {participants.length} members
              </span>
            </div>
          )}
        </div>
        
        {/* Show GroupChatMembers only for group chats */}
        {/* Individual chats (2-person with "Direct message" name) do NOT have add/remove friend functionality */}
        {/* Groups remain groups even if they have 1 or 2 members */}
        {isGroupChat && (
          <GroupChatMembers
            chatId={chatId}
            currentUserId={session.user.id}
            participants={participants}
            friends={friends}
            isGroupChat={isGroupChat}
            chatName={chat.name}
          />
        )}
      </div>

      <ChatWrapper
        chatId={chatId}
        participants={participants}
        sessionImg={session.user.image}
        sessionId={session.user.id}
        initialMessages={initialMessages}
        chatName={chat.name}
      />
    </div>
  );
};

export default page;
