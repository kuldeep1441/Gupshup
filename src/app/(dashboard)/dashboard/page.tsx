import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { ChevronRight } from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const page = async ({}) => {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  // Load all chats the current user is a member of and their last messages.
  const chatIds = (await fetchRedis(
    "smembers",
    `user:${session.user.id}:chats`
  )) as string[];

  const chatsWithLastMessage = await Promise.all(
    chatIds.map(async (chatId) => {
      const chatRaw = (await fetchRedis("get", `chat:${chatId}`)) as string;
      const chat = JSON.parse(chatRaw) as Chat;

      const [lastMessageRaw] = (await fetchRedis(
        "zrange",
        `chat:${chat.id}:messages`,
        -1,
        -1
      )) as string[];

      const lastMessage = lastMessageRaw
        ? (JSON.parse(lastMessageRaw) as Message)
        : null;

      const participants = await Promise.all(
        chat.memberIds.map(async (memberId) => {
          const raw = (await fetchRedis("get", `user:${memberId}`)) as string;
          return JSON.parse(raw) as User;
        })
      );

      return {
        chat,
        lastMessage,
        participants,
      };
    })
  );

  // Filter out chats with no messages
  const chatsWithMessages = chatsWithLastMessage.filter(
    (item): item is { chat: Chat; lastMessage: Message; participants: User[] } =>
      item.lastMessage !== null
  );

  return (
    <div className="container py-12">
      <h1 className="font-bold text-5xl mb-8">Recent chats</h1>
      {chatsWithMessages.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing to show here...</p>
      ) : (
        <div className="flex flex-col gap-4">
        {chatsWithMessages.map(({ chat, lastMessage, participants }) => {
          const isTwoPersonChat = participants.length === 2;
          const chatPartner = isTwoPersonChat
            ? participants.find((p) => p.id !== session.user.id) ??
              participants[0]
            : null;

          const displayName =
            isTwoPersonChat && chatPartner ? chatPartner.name : chat.name;

          const displayAvatar = chatPartner ?? participants[0];

          return (
          <div
            key={chat.id}
            className="relative bg-zinc-50 border border-zinc-200 p-3 rounded-md">
            <div className="absolute right-4 inset-y-0 flex items-center">
              <ChevronRight className="h-7 w-7 text-zinc-400" />
            </div>

            <Link
              href={`/dashboard/chat/${chat.id}`}
              className="relative sm:flex">
              <div className="mb-4 flex-shrink-0 sm:mb-0 sm:mr-4">
                <div className="relative h-6 w-6">
                  <Image
                    referrerPolicy="no-referrer"
                    className="rounded-full"
                    alt={`${displayName} profile picture`}
                    src={displayAvatar.image}
                    fill
                  />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold">{displayName}</h4>
                <p className="mt-1 max-w-md">
                  <span className="text-zinc-400">
                    {lastMessage.senderId === session.user.id
                      ? "You: "
                      : ""}
                  </span>
                  {lastMessage.text}
                </p>
              </div>
            </Link>
          </div>
        );
        })}
        </div>
      )}
    </div>
  );
};

export default page;
