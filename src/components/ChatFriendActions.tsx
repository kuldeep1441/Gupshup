"use client";

import { FC, useState, useEffect } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import Button from "./common/Button";
import AddFriendModal from "./AddFriendModal";
import RemoveFriendModal from "./RemoveFriendModal";
import axios from "axios";

interface ChatFriendActionsProps {
  chatPartner: User | null;
  sessionId: string;
  isTwoPersonChat: boolean;
}

/**
 * Component that displays add/remove friend buttons in a chat.
 * Shows appropriate buttons based on whether the chat partner is a friend.
 * 
 * @param chatPartner - The chat partner user (null for group chats)
 * @param sessionId - The current user's session ID
 * @param isTwoPersonChat - Whether this is a 1-to-1 chat
 */
const ChatFriendActions: FC<ChatFriendActionsProps> = ({
  chatPartner,
  sessionId,
  isTwoPersonChat,
}) => {
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);

  /**
   * Checks if the chat partner is already a friend.
   */
  useEffect(() => {
    const checkFriendship = async () => {
      if (!chatPartner || !isTwoPersonChat) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await axios.get("/api/friends/check", {
          params: { id: chatPartner.id },
        });
        setIsFriend(response.data.isFriend);
      } catch (error) {
        setIsFriend(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkFriendship();
  }, [chatPartner, isTwoPersonChat]);

  // Only show buttons for 1-to-1 chats
  if (!isTwoPersonChat || !chatPartner || isChecking) {
    return null;
  }

  return (
    <>
      {isFriend ? (
        <Button
          onClick={() => setShowRemoveModal(true)}
          variant="ghost"
          className="gap-2">
          <UserMinus className="h-4 w-4" />
          Remove Friend
        </Button>
      ) : (
        <Button
          onClick={() => setShowAddModal(true)}
          variant="ghost"
          className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Friend
        </Button>
      )}

      <AddFriendModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        prefillEmail={chatPartner.email}
      />

      <RemoveFriendModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        friend={chatPartner}
      />
    </>
  );
};

export default ChatFriendActions;

