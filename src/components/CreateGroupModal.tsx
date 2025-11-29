"use client";

import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Search, UserPlus } from "lucide-react";
import Button from "./common/Button";
import { toast } from "react-hot-toast";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: User[];
  sessionId: string;
}

/**
 * Modal component for creating a new group.
 * First asks for group name, then shows friend selection with search.
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 * @param friends - List of all user's friends
 * @param sessionId - The current user's session ID
 */
const CreateGroupModal: FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  friends,
  sessionId,
}) => {
  const router = useRouter();
  const [groupName, setGroupName] = useState<string>("");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [step, setStep] = useState<"name" | "members">("name");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  /**
   * Toggles friend selection.
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
   * Handles moving to member selection step.
   */
  const handleNextToMembers = () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      toast.error("Group name cannot be empty.");
      return;
    }
    setStep("members");
  };

  /**
   * Handles creating the group.
   */
  const handleCreateGroup = async () => {
    if (selectedFriends.size === 0) {
      toast.error("Please select at least one friend to add to the group.");
      return;
    }

    try {
      setIsCreating(true);

      // Create the group with current user and selected friends
      const memberIds = [sessionId, ...Array.from(selectedFriends)];

      const response = await axios.post("/api/chat/create", {
        name: groupName.trim(),
        memberIds,
      });

      const newChat = response.data as Chat;

      toast.success("Group created successfully!");
      onClose();
      resetModal();
      
      // Navigate to the new group chat
      router.push(`/dashboard/chat/${newChat.id}`);
    } catch (error) {
      setIsCreating(false);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data || "Failed to create group.";
        toast.error(errorMessage);
        return;
      }

      toast.error("Something went wrong.");
    }
  };

  /**
   * Resets the modal state.
   */
  const resetModal = () => {
    setGroupName("");
    setSelectedFriends(new Set());
    setSearchQuery("");
    setStep("name");
    setIsCreating(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                    {step === "name" ? "Create New Group" : "Add Members"}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {step === "name" ? (
                  <>
                    <div className="mt-4">
                      <label
                        htmlFor="groupName"
                        className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                        Group Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="groupName"
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && groupName.trim()) {
                            handleNextToMembers();
                          }
                        }}
                        placeholder="Enter group name"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        autoFocus
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNextToMembers}
                        disabled={!groupName.trim()}>
                        Next
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-4">
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search friends..."
                          className="block w-full pl-10 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {friends.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            {searchQuery
                              ? "No friends found matching your search."
                              : "No friends available."}
                          </p>
                        ) : (
                          friends.map((friend) => {
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
                          })
                        )}
                      </div>

                      {selectedFriends.size > 0 && (
                        <p className="mt-3 text-sm text-gray-600">
                          {selectedFriends.size} friend
                          {selectedFriends.size > 1 ? "s" : ""} selected
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep("name")}
                        disabled={isCreating}>
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCreateGroup}
                        disabled={isCreating || selectedFriends.size === 0}>
                        {isCreating ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          "Create Group"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateGroupModal;

