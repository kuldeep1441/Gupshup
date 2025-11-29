import { Icon, Icons } from "@/components/Icons";
import SignOutButton from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FC, ReactNode } from "react";
import { fetchRedis } from "@/helpers/redis";
import FriendRequestSidebarOptions from "@/components/FriendRequestSidebarOptions";
import { getFriendsByUserId } from "@/helpers/get-friends-by-user-id";
import SidebarChatList from "@/components/SidebarChatList";
import MobileChatLayout from "@/components/MobileChatLayout";
import ChatsList from "@/components/ChatsList";
import AllFriendsList from "@/components/AllFriendsList";
// import { SidebarOption } from '@/types/typings'

interface LayoutProps {
  children: ReactNode;
}

// Done after the video and optional: add page metadata
// export const metadata = {
//   title: 'FriendZone | Dashboard',
//   description: 'Your dashboard',
// }

interface SidebarOption {
  id: number;
  name: string;
  href: string;
  Icon: Icon;
}

const sidebarOptions: SidebarOption[] = [
  {
    id: 1,
    name: "Add friend",
    href: "/dashboard/add",
    Icon: "UserPlus",
  },
];

const Layout = async ({ children }: LayoutProps) => {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const friends = await getFriendsByUserId(session.user.id);

  // Load all chats the current user is a member of so that the sidebar
  // can link by concrete chat id (works for group chats as well).
  const chatIds = (await fetchRedis(
    "smembers",
    `user:${session.user.id}:chats`
  )) as string[];

  const chatsWithDisplayNameAndMessages = await Promise.all(
    chatIds.map(async (chatId) => {
      const rawChat = (await fetchRedis("get", `chat:${chatId}`)) as string;
      const chat = JSON.parse(rawChat) as Chat;

      // Get the latest message timestamp (if any)
      // zrange with -1 gets the last (most recent) message
      const latestMessageRaw = (await fetchRedis(
        "zrange",
        `chat:${chatId}:messages`,
        -1,
        -1
      )) as string[];
      
      let latestMessageTimestamp: number | null = null;
      if (latestMessageRaw && latestMessageRaw.length > 0) {
        // Parse the message to get its timestamp
        const latestMessage = JSON.parse(latestMessageRaw[0]) as Message;
        latestMessageTimestamp = latestMessage.timestamp;
      }

      // Check if chat has any messages
      const hasMessages = latestMessageTimestamp !== null;

      // Load participants to decide how to label the chat in "Your chats".
      const participants = await Promise.all(
        chat.memberIds.map(async (memberId) => {
          const rawUser = (await fetchRedis(
            "get",
            `user:${memberId}`
          )) as string;
          return JSON.parse(rawUser) as User;
        })
      );

      const isTwoPersonChat = participants.length === 2;
      const chatPartner = isTwoPersonChat
        ? participants.find((p) => p.id !== session.user.id) ?? participants[0]
        : null;

      const displayName =
        isTwoPersonChat && chatPartner ? chatPartner.name : chat.name;

      return {
        chat,
        displayName,
        hasMessages,
        chatPartner: isTwoPersonChat ? chatPartner : null,
        latestMessageTimestamp,
        createdAt: chat.createdAt || null, // Get creation date for groups
      };
    })
  );

  // Filter to only show chats with messages (for individual chats)
  const chatsWithDisplayName = chatsWithDisplayNameAndMessages.filter(
    (chat) => chat.hasMessages
  );

  // Separate 2-person chats from group chats
  // Individual chats: ONLY show those with messages AND named "Direct message" AND have 2 members
  // "Your chats" should only contain individual chats that have at least one message
  const individualChatsUnsorted = chatsWithDisplayName.filter(
    (item) => 
      item.hasMessages && // Explicitly ensure chat has messages
      item.chat.memberIds.length === 2 && 
      item.chat.name === "Direct message"
  );
  
  // Sort individual chats by latest message timestamp (most recent first)
  // Latest message received chat should be on top, second latest on second, and so on
  const individualChats = individualChatsUnsorted.sort((a, b) => {
    const timestampA = a.latestMessageTimestamp || 0;
    const timestampB = b.latestMessageTimestamp || 0;
    return timestampB - timestampA; // Descending order (newest first = top)
  });
  
  // Group chats: show ALL groups (with or without messages)
  // Groups are identified by having a name other than "Direct message" OR having more than 2 members
  // IMPORTANT: Exclude individual chats (2 members AND "Direct message" name)
  const groupChatsUnsorted = chatsWithDisplayNameAndMessages
    .filter((item) => {
      // Exclude individual chats (2 members with "Direct message" name)
      const isIndividualChat = item.chat.memberIds.length === 2 && item.chat.name === "Direct message";
      if (isIndividualChat) {
        return false;
      }
      
      // A chat is a group if:
      // 1. It has more than 2 members, OR
      // 2. It has 1-2 members but is NOT named "Direct message" (was originally a group)
      return item.chat.memberIds.length > 2 || 
             (item.chat.memberIds.length >= 1 && item.chat.name !== "Direct message");
    })
    .map((item) => ({
      chat: item.chat,
      displayName: item.displayName,
      latestMessageTimestamp: item.latestMessageTimestamp,
      createdAt: item.createdAt,
    }));

  // Sort group chats by max(created date, latest message received)
  // Group with highest max value (most recent) should be on top, and so on
  const groupChats = groupChatsUnsorted.sort((a, b) => {
    // For group A: calculate max(createdAt, latestMessageTimestamp)
    const timestampA = Math.max(
      a.latestMessageTimestamp || 0,
      a.createdAt || 0
    );
    
    // For group B: calculate max(createdAt, latestMessageTimestamp)
    const timestampB = Math.max(
      b.latestMessageTimestamp || 0,
      b.createdAt || 0
    );
    
    // Sort in descending order (highest/most recent timestamp at top)
    return timestampB - timestampA;
  });


  const unseenRequestCount = (
    (await fetchRedis(
      "smembers",
      `user:${session.user.id}:incoming_friend_requests`
    )) as User[]
  ).length;

  return (
    <div className="w-full flex h-screen">
      <div className="md:hidden">
        <MobileChatLayout
          chats={individualChats}
          groups={groupChats}
          session={session}
          sidebarOptions={sidebarOptions}
          unseenRequestCount={unseenRequestCount}
          friends={friends}
        />
      </div>

      <div className="hidden md:flex h-full w-full max-w-xs grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
        <Link href="/dashboard" className="flex h-16 shrink-0 items-center">
          <Icons.Logo className="h-8 w-auto text-indigo-600" />
        </Link>

        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ChatsList
                chats={individualChats}
                groups={groupChats}
                sessionId={session.user.id}
                friends={friends}
              />
            </li>
            
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400">
                Friends
              </div>
              <AllFriendsList
                friends={friends}
                sessionId={session.user.id}
              />
            </li>
            
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400">
                Overview
              </div>

              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {sidebarOptions.map((option) => {
                  const Icon = Icons[option.Icon];
                  return (
                    <li key={option.id}>
                      <Link
                        href={option.href}
                        className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 group flex gap-3 rounded-md p-2 text-sm leading-6 font-semibold">
                        <span className="text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white">
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="truncate">{option.name}</span>
                      </Link>
                    </li>
                  );
                })}

                <li>
                  <FriendRequestSidebarOptions
                    sessionId={session.user.id}
                    initialUnseenRequestCount={unseenRequestCount}
                  />
                </li>
              </ul>
            </li>

            <li className="-mx-6 mt-auto flex items-center">
              <div className="flex flex-1 items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900">
                <div className="relative h-8 w-8 bg-gray-50">
                  <Image
                    fill
                    referrerPolicy="no-referrer"
                    className="rounded-full"
                    src={session.user.image || ""}
                    alt="Your profile picture"
                  />
                </div>

                <span className="sr-only">Your profile</span>
                <div className="flex flex-col">
                  <span aria-hidden="true">{session.user.name}</span>
                  <span className="text-xs text-zinc-400" aria-hidden="true">
                    {session.user.email}
                  </span>
                </div>
              </div>

              <SignOutButton className="h-full aspect-square" />
            </li>
          </ul>
        </nav>
      </div>

      <aside className="max-h-screen container py-16 md:py-12 w-full">
        {children}
      </aside>
    </div>
  );
};

export default Layout;
