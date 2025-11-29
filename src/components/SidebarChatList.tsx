"use client";

import { pusherClient } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { FC, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import UnseenChatToast from "./UnseenChatToast";

interface SidebarChatListProps {
  chats: {
    chat: Chat;
    displayName: string;
  }[];
  sessionId: string;
  viewType?: "chats" | "groups";
}

interface ExtendedMessage extends Message {
  senderImg: string;
  senderName: string;
}

const SidebarChatList: FC<SidebarChatListProps> = ({ chats, sessionId, viewType }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [unseenMessages, setUnseenMessages] = useState<Message[]>([]);
  const [activeChats, setActiveChats] = useState<SidebarChatListProps["chats"]>(chats);

  useEffect(() => {
    pusherClient.subscribe(toPusherKey(`user:${sessionId}:chats`));

    const chatHandler = (message: ExtendedMessage) => {
      // If chat doesn't exist, add it to the list
      // Use functional update to avoid dependency on activeChats
      setActiveChats((prev) => {
        // Check if this chat already exists in our active chats list
        const chatExists = prev.some(({ chat }) => chat.id === message.chatId);
        
        if (chatExists) {
          return prev;
        }
        
        // For 1-to-1 chats, use sender name as display name
        // The chat will be created on the server when the message is sent
        const newChat: Chat = {
          id: message.chatId,
          name: "Direct message",
          memberIds: [sessionId, message.senderId],
        };
        
        // Filter based on view type if specified
        // New chats from messages are always 2-person chats, so only add in "chats" view
        if (viewType === "groups") {
          return prev;
        }
        
        return [
          ...prev,
          {
            chat: newChat,
            displayName: message.senderName,
          },
        ];
      });

      // Only notify if the user is not already viewing this exact chat.
      const shouldNotify =
        pathname !== `/dashboard/chat/${message.chatId}`;

      if (!shouldNotify) return;

      // should be notified
      toast.custom((t) => (
        <UnseenChatToast
          t={t}
          sessionId={sessionId}
          senderId={message.senderId}
          senderImg={message.senderImg}
          senderMessage={message.text}
          senderName={message.senderName}
          chatId={message.chatId}
        />
      ));

      setUnseenMessages((prev) => [...prev, message]);
    };

    /**
     * Handles chat updates when members are added or removed.
     * Updates the chat in the list with the new member information.
     */
    const chatUpdateHandler = (data: { chatId: string; chat: Chat }) => {
      setActiveChats((prev) => {
        return prev.map((item) => {
          if (item.chat.id === data.chatId) {
            // Update the chat with new member information
            // For group chats, keep the group name; for 2-person chats, update display name
            // Groups are identified by NOT being named "Direct message"
            const isIndividualChat = data.chat.memberIds.length === 2 && data.chat.name === "Direct message";
            const displayName = isIndividualChat
              ? item.displayName // Keep existing display name for 2-person individual chats
              : data.chat.name; // Use group name for group chats (even if they have 2 members)
            
            return {
              chat: data.chat,
              displayName,
            };
          }
          return item;
        });
      });
    };

    /**
     * Handles when user is added to a new chat.
     * Adds the chat to the list if it doesn't exist and matches the current view.
     * Shows a toast notification when added to a group (only if not the creator).
     */
    const addedToChatHandler = (data: { chatId: string; chat: Chat }) => {
      // Determine if it's an individual chat (2 members AND named "Direct message")
      // Groups can have any number of members (including 1 or 2) and are identified by NOT being "Direct message"
      const isIndividualChat = data.chat.memberIds.length === 2 && data.chat.name === "Direct message";
      const isGroupChat = !isIndividualChat;
      
      // Show toast notification when added to a group (not for 2-person individual chats)
      // Note: This event is only sent to members who were added, not the creator
      if (isGroupChat) {
        toast.success(`You've been added to "${data.chat.name}"`);
      }
      
      setActiveChats((prev) => {
        const chatExists = prev.some(({ chat }) => chat.id === data.chatId);
        if (chatExists) {
          return prev;
        }
        
        // Filter based on view type if specified
        if (viewType === "chats" && !isIndividualChat) {
          // In chats view, only show individual chats (2-person with "Direct message" name)
          return prev;
        }
        if (viewType === "groups" && isIndividualChat) {
          // In groups view, only show group chats (not individual chats)
          return prev;
        }
        
        // Add the new chat to the list
        const displayName = data.chat.name;
        
        return [
          ...prev,
          {
            chat: data.chat,
            displayName,
          },
        ];
      });
    };

    /**
     * Handles when a new chat is created (for group creation).
     * Adds the chat to the list if it doesn't exist and matches the current view.
     * Does NOT show toast for the creator (they already know they created it).
     * Other members will receive added_to_chat event which shows the toast.
     */
    const chatCreatedHandler = (newChat: Chat) => {
      // Determine if it's an individual chat (2 members AND named "Direct message")
      // Groups can have any number of members (including 1 or 2) and are identified by NOT being "Direct message"
      const isIndividualChat = newChat.memberIds.length === 2 && newChat.name === "Direct message";
      const isGroupChat = !isIndividualChat;
      
      // Don't show toast here - the creator receives this event but shouldn't see a toast
      // Other members receive added_to_chat event which shows the toast
      
      setActiveChats((prev) => {
        const chatExists = prev.some(({ chat }) => chat.id === newChat.id);
        if (chatExists) {
          return prev;
        }
        
        // Filter based on view type if specified
        if (viewType === "chats" && !isIndividualChat) {
          // In chats view, only show individual chats (2-person with "Direct message" name)
          return prev;
        }
        if (viewType === "groups" && isIndividualChat) {
          // In groups view, only show group chats (not individual chats)
          return prev;
        }
        
        // Add the new chat to the list
        const displayName = newChat.name;
        
        return [
          ...prev,
          {
            chat: newChat,
            displayName,
          },
        ];
      });
    };

    pusherClient.bind("new_message", chatHandler);
    pusherClient.bind("chat_updated", chatUpdateHandler);
    pusherClient.bind("added_to_chat", addedToChatHandler);
    pusherClient.bind("chat_created", chatCreatedHandler);

    return () => {
      pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:chats`));

      pusherClient.unbind("new_message", chatHandler);
      pusherClient.unbind("chat_updated", chatUpdateHandler);
      pusherClient.unbind("added_to_chat", addedToChatHandler);
      pusherClient.unbind("chat_created", chatCreatedHandler);
    };
  }, [pathname, sessionId, router, viewType]);

  useEffect(() => {
    if (pathname?.includes("chat")) {
      setUnseenMessages((prev) => {
        // Clear unseen messages for the chat that is currently open,
        // identified by its chat id in the URL, rather than by sender id.
        return prev.filter((msg) => !pathname.endsWith(msg.chatId));
      });
    }
  }, [pathname]);

  // Update activeChats when chats prop or viewType changes
  useEffect(() => {
    setActiveChats(chats);
  }, [chats]);

  return (
    <ul role="list" className="max-h-[25rem] overflow-y-auto -mx-2 space-y-1">
      {activeChats.map(({ chat, displayName }) => {
        const unseenMessagesCount = unseenMessages.filter((unseenMsg) => {
          // Count unseen messages for this chat.
          return unseenMsg.chatId === chat.id;
        }).length;

        return (
          <li key={chat.id}>
            <Link
              href={`/dashboard/chat/${chat.id}`}
              className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold">
              {displayName}
              {unseenMessagesCount > 0 ? (
                <div className="bg-indigo-600 font-medium text-xs text-white w-4 h-4 rounded-full flex justify-center items-center">
                  {unseenMessagesCount}
                </div>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarChatList;
