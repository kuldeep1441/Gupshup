"use client";

import { chatHrefConstructor } from "@/lib/utils";
import { pusherClient } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FC, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface FriendsListProps {
  friends: User[];
  sessionId: string;
  existingChatIds: string[];
}

/**
 * Component that displays a list of friends and allows opening a chat with them.
 * Listens for new friend events and updates the list dynamically.
 * 
 * @param friends - Array of user objects representing the current user's friends
 * @param sessionId - The current user's session ID
 * @param existingChatIds - Array of chat IDs that already exist (to filter out friends with existing chats)
 */
const FriendsList: FC<FriendsListProps> = ({
  friends,
  sessionId,
  existingChatIds,
}) => {
  const router = useRouter();
  const [activeFriends, setActiveFriends] = useState<User[]>(friends);
  const [activeChatIds, setActiveChatIds] = useState<string[]>(existingChatIds);

  useEffect(() => {
    pusherClient.subscribe(toPusherKey(`user:${sessionId}:friends`));

    const newFriendHandler = (newFriend: User) => {
      // Check if friend already exists
      setActiveFriends((prev) => {
        if (prev.some((f) => f.id === newFriend.id)) {
          return prev;
        }
        toast.success(`${newFriend.name} accepted your friend request!`);
        return [...prev, newFriend];
      });
    };

    const friendRemovedHandler = (removedFriendId: string) => {
      setActiveFriends((prev) => {
        const friend = prev.find((f) => f.id === removedFriendId);
        if (friend) {
          toast.success(`${friend.name} removed you as a friend`);
          return prev.filter((f) => f.id !== removedFriendId);
        }
        return prev;
      });
    };

    pusherClient.bind("new_friend", newFriendHandler);
    pusherClient.bind("friend_removed", friendRemovedHandler);

    return () => {
      pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:friends`));
      pusherClient.unbind("new_friend", newFriendHandler);
      pusherClient.unbind("friend_removed", friendRemovedHandler);
    };
  }, [sessionId]);

  // Update active friends when props change
  useEffect(() => {
    setActiveFriends(friends);
  }, [friends]);

  // Update active chat IDs when props change
  useEffect(() => {
    setActiveChatIds(existingChatIds);
  }, [existingChatIds]);

  /**
   * Handles clicking on a friend to open or create a chat.
   * Creates a chat ID using the chatHrefConstructor and navigates to that chat.
   * 
   * @param friendId - The ID of the friend to chat with
   */
  const handleFriendClick = (friendId: string) => {
    const chatId = chatHrefConstructor(sessionId, friendId);
    router.push(`/dashboard/chat/${chatId}`);
  };

  // Show only friends who don't have an individual chat (2-person chat)
  // existingChatIds should only contain individual chat IDs
  const friendsToShow = activeFriends.filter((friend) => {
    const chatId = chatHrefConstructor(sessionId, friend.id);
    const hasIndividualChat = activeChatIds.includes(chatId);
    
    // Only show friends who don't have an individual chat
    return !hasIndividualChat;
  });

  if (friendsToShow.length === 0) {
    return null;
  }

  return (
    <ul role="list" className="max-h-[25rem] overflow-y-auto -mx-2 space-y-1">
      {friendsToShow.map((friend) => {
        return (
          <li key={friend.id}>
            <button
              onClick={() => handleFriendClick(friend.id)}
              className="text-gray-700 hover:text-indigo-600 hover:bg-gray-50 group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left">
              <div className="relative h-6 w-6 bg-gray-50 flex-shrink-0">
                <Image
                  fill
                  referrerPolicy="no-referrer"
                  className="rounded-full"
                  src={friend.image || ""}
                  alt={`${friend.name} profile picture`}
                />
              </div>
              <span className="truncate">{friend.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default FriendsList;

