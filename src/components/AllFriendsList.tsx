"use client";

import { FC, useState, useEffect } from "react";
import { Search } from "lucide-react";
import Image from "next/image";
import { chatHrefConstructor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface AllFriendsListProps {
  friends: User[];
  sessionId: string;
}

/**
 * Component that displays all friends with a search bar.
 * Allows users to search and view all their friends.
 * 
 * @param friends - Array of user objects representing all friends
 * @param sessionId - The current user's session ID
 */
const AllFriendsList: FC<AllFriendsListProps> = ({
  friends,
  sessionId,
}) => {
  const router = useRouter();
  const [activeFriends, setActiveFriends] = useState<User[]>(friends);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    pusherClient.subscribe(toPusherKey(`user:${sessionId}:friends`));

    const newFriendHandler = (newFriend: User) => {
      setActiveFriends((prev) => {
        if (prev.some((f) => f.id === newFriend.id)) {
          return prev;
        }
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

  /**
   * Filters friends based on search query.
   */
  const filteredFriends = activeFriends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (activeFriends.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-sm text-zinc-500">No friends yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search friends..."
          className="block w-full pl-10 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm leading-6"
        />
      </div>

      <ul role="list" className="max-h-[25rem] overflow-y-auto -mx-2 space-y-1">
        {filteredFriends.length === 0 ? (
          <li className="px-2 py-2">
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "No friends found matching your search."
                : "No friends available."}
            </p>
          </li>
        ) : (
          filteredFriends.map((friend) => {
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
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{friend.name}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {friend.email}
                    </span>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default AllFriendsList;

