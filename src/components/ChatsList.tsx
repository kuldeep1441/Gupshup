"use client";

import { FC, useState, useMemo, useEffect } from "react";
import SidebarChatList from "./SidebarChatList";
import CreateGroupModal from "./CreateGroupModal";
import ChatsAndGroupsToggle from "./ChatsAndGroupsToggle";
import Button from "./common/Button";
import { UserPlus } from "lucide-react";

interface ChatsListProps {
  chats: {
    chat: Chat;
    displayName: string;
  }[];
  groups: {
    chat: Chat;
    displayName: string;
  }[];
  sessionId: string;
  friends: User[];
}

/**
 * Component that displays chats and groups with toggle functionality.
 * Shows individual chats or groups based on selected view.
 * 
 * @param chats - Array of 2-person chats
 * @param groups - Array of group chats (>2 members)
 * @param sessionId - The current user's session ID
 * @param friends - List of all user's friends
 */
const ChatsList: FC<ChatsListProps> = ({
  chats,
  groups,
  sessionId,
  friends,
}) => {
  // Start with default "chats" to match server render (prevents hydration error)
  const [currentView, setCurrentView] = useState<"chats" | "groups">("chats");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Load persisted view from localStorage after mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("chatsView") as "chats" | "groups" | null;
      if (savedView && (savedView === "chats" || savedView === "groups")) {
        setCurrentView(savedView);
      }
    }
  }, []);

  // Persist view to localStorage whenever it changes (only after mount)
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      localStorage.setItem("chatsView", currentView);
    }
  }, [currentView, isMounted]);

  // Filter chats based on current view for initial display
  // SidebarChatList will handle real-time updates via Pusher
  const displayedChats = useMemo(() => {
    if (currentView === "chats") {
      return chats;
    } else {
      return groups;
    }
  }, [currentView, chats, groups]);

  return (
    <>
      <ChatsAndGroupsToggle
        onViewChange={setCurrentView}
        currentView={currentView}
      />

      {currentView === "groups" && (
        <div className="mb-4">
          <Button
            onClick={() => setShowCreateGroupModal(true)}
            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <UserPlus className="h-4 w-4" />
            Create New Group
          </Button>
        </div>
      )}

      <SidebarChatList
        sessionId={sessionId}
        chats={displayedChats}
        viewType={currentView}
      />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        friends={friends}
        sessionId={sessionId}
      />
    </>
  );
};

export default ChatsList;

