"use client";

import { FC, useState, Fragment } from "react";
import { UserPlus, UserMinus, X } from "lucide-react";
import Button from "./common/Button";
import { Dialog, Transition } from "@headlessui/react";
import { toast } from "react-hot-toast";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface GroupChatMembersProps {
  chatId: string;
  currentUserId: string;
  participants: User[];
  friends: User[];
  isGroupChat: boolean;
  chatName?: string;
}

/**
 * Component for managing chat members (add/remove friends).
 * - Shows "Add Friend" button when there are friends not in the chat (works for both 2-person and group chats)
 * - Shows "Remove Friend" button only for group chats (>2 members) when there are friends in the chat
 * - Add Friend modal supports multi-select to add multiple friends at once
 * 
 * @param chatId - The ID of the chat
 * @param currentUserId - The current user's ID
 * @param participants - Current participants in the chat
 * @param friends - List of all user's friends
 * @param isGroupChat - Whether this is a group chat (>2 members)
 */
const GroupChatMembers: FC<GroupChatMembersProps> = ({
  chatId,
  currentUserId,
  participants,
  friends,
  isGroupChat,
  chatName,
}) => {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // Get friends who are not in the chat
  const friendsNotInChat = friends.filter(
    (friend) => !participants.some((p) => p.id === friend.id)
  );

  // Get friends who are in the chat (excluding current user)
  // Only show remove option for group chats (>2 members)
  const friendsInChat = isGroupChat
    ? participants.filter(
        (participant) =>
          participant.id !== currentUserId &&
          friends.some((f) => f.id === participant.id)
      )
    : [];

  /**
   * Toggles friend selection in the add modal.
   * 
   * @param friendId - The ID of the friend to toggle
   */
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  /**
   * Handles opening the add friend modal.
   */
  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  /**
   * Handles adding selected friends to the chat.
   * Only works for group chats (>2 members).
   */
  const handleAddSelectedFriends = async () => {
    if (selectedFriends.size === 0) {
      toast.error("Please select at least one friend to add.");
      return;
    }

    try {
      setIsAdding(true);
      
      // Add all selected friends
      const addPromises = Array.from(selectedFriends).map((friendId) =>
        axios.post("/api/chat/add-member", {
          chatId,
          memberId: friendId,
        })
      );

      await Promise.all(addPromises);

      toast.success(
        `${selectedFriends.size} friend${selectedFriends.size > 1 ? "s" : ""} added to chat!`
      );
      setShowAddModal(false);
      setSelectedFriends(new Set());
      setIsAdding(false);
      // Refresh the server component data without full page reload
      router.refresh();
    } catch (error) {
      setIsAdding(false);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data || "Failed to add friends.";
        toast.error(errorMessage);
        return;
      }

      toast.error("Something went wrong.");
    }
  };

  /**
   * Handles removing a friend from the chat.
   * 
   * @param memberId - The ID of the member to remove
   */
  const handleRemoveMember = async (memberId: string) => {
    try {
      setIsRemoving(memberId);
      await axios.post("/api/chat/remove-member", {
        chatId,
        memberId,
      });

      toast.success("Member removed from chat!");
      setShowRemoveModal(false);
      setIsRemoving(null);
      // Refresh the server component data without full page reload
      router.refresh();
    } catch (error) {
      setIsRemoving(null);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data || "Failed to remove member.";
        toast.error(errorMessage);
        return;
      }

      toast.error("Something went wrong.");
    }
  };

  // Don't render for individual chats (2-person chats with name "Direct message")
  // Groups can have any number of members (including 1 or 2) and should always show add/remove functionality
  // Individual chats are identified by having exactly 2 members AND being named "Direct message"
  const isIndividualChat = participants.length === 2 && chatName === "Direct message";
  if (isIndividualChat) {
    return null;
  }

  // Only render if there are actions available for group chats
  const hasAddAction = friendsNotInChat.length > 0;
  // Only show remove button for group chats (>2 members)
  const hasRemoveAction = friendsInChat.length > 0;

  if (!hasAddAction && !hasRemoveAction) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {hasAddAction && (
          <Button
            onClick={handleOpenAddModal}
            variant="ghost"
            className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Friend
          </Button>
        )}

        {hasRemoveAction && (
          <Button
            onClick={() => setShowRemoveModal(true)}
            variant="ghost"
            className="gap-2">
            <UserMinus className="h-4 w-4" />
            Remove Friend
          </Button>
        )}
      </div>

      {/* Add Friend Modal */}
      <Transition appear show={showAddModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowAddModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900">
                      Add Friend to Chat
                    </Dialog.Title>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4">
                    {friendsNotInChat.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        All your friends are already in this chat.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {friendsNotInChat.map((friend) => {
                            const isSelected = selectedFriends.has(friend.id);
                            return (
                              <div
                                key={friend.id}
                                onClick={() => toggleFriendSelection(friend.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-50"
                                    : "border-gray-200 hover:bg-gray-50"
                                }`}>
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                      isSelected
                                        ? "border-indigo-600 bg-indigo-600"
                                        : "border-gray-300"
                                    }`}>
                                    {isSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor">
                                        <path d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    )}
                                  </div>
                                  <div className="relative h-10 w-10 bg-gray-50 flex-shrink-0">
                                    <Image
                                      fill
                                      referrerPolicy="no-referrer"
                                      className="rounded-full"
                                      src={friend.image || ""}
                                      alt={`${friend.name} profile picture`}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {friend.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {friend.email}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {selectedFriends.size > 0 && (
                          <p className="mt-3 text-sm text-gray-600">
                            {selectedFriends.size} friend
                            {selectedFriends.size > 1 ? "s" : ""} selected
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedFriends(new Set());
                      }}
                      disabled={isAdding}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddSelectedFriends}
                      disabled={
                        isAdding ||
                        selectedFriends.size === 0
                      }>
                      {isAdding ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        `Add ${selectedFriends.size > 0 ? `(${selectedFriends.size})` : ""}`
                      )}
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Remove Friend Modal */}
      <Transition appear show={showRemoveModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowRemoveModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900">
                      Remove Friend from Chat
                    </Dialog.Title>
                    <button
                      onClick={() => setShowRemoveModal(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-4">
                    {friendsInChat.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No friends to remove from this chat.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {friendsInChat.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 bg-gray-50 flex-shrink-0">
                                <Image
                                  fill
                                  referrerPolicy="no-referrer"
                                  className="rounded-full"
                                  src={member.image || ""}
                                  alt={`${member.name} profile picture`}
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={isRemoving === member.id}
                              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed">
                              {isRemoving === member.id ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                "Remove"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowRemoveModal(false)}
                      disabled={isRemoving !== null}>
                      Close
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default GroupChatMembers;

