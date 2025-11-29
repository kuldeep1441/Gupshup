"use client";

import axios, { AxiosError } from "axios";
import { FC, Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Trash2 } from "lucide-react";
import Button from "./common/Button";
import { toast } from "react-hot-toast";
import Image from "next/image";

interface RemoveFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend?: User;
  friends?: User[];
}

/**
 * Modal component for removing a friend.
 * Can be used with a specific friend (from chat) or show a list of all friends.
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 * @param friend - Optional specific friend to remove (used in chat context)
 * @param friends - Optional list of all friends (if no specific friend provided)
 */
const RemoveFriendModal: FC<RemoveFriendModalProps> = ({
  isOpen,
  onClose,
  friend,
  friends = [],
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);

  /**
   * Handles removing a friend.
   * 
   * @param friendId - The ID of the friend to remove
   */
  const removeFriend = async (friendId: string) => {
    try {
      setRemovingId(friendId);
      await axios.post("/api/friends/remove", { id: friendId });

      toast.success("Friend removed successfully");
      onClose();
      setRemovingId(null);
    } catch (error) {
      setRemovingId(null);
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data || "Failed to remove friend.";
        toast.error(errorMessage);
        return;
      }

      toast.error("Something went wrong.");
    }
  };

  const handleClose = () => {
    setRemovingId(null);
    onClose();
  };

  // If a specific friend is provided, show only that friend
  const friendsToShow = friend ? [friend] : friends;

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
                    {friend ? "Remove Friend" : "Remove Friends"}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4">
                  {friendsToShow.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No friends to remove.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {friendsToShow.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 bg-gray-50 flex-shrink-0">
                              <Image
                                fill
                                referrerPolicy="no-referrer"
                                className="rounded-full"
                                src={f.image || ""}
                                alt={`${f.name} profile picture`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {f.name}
                              </p>
                              <p className="text-xs text-gray-500">{f.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFriend(f.id)}
                            disabled={removingId === f.id}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed">
                            {removingId === f.id ? (
                              <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="h-5 w-5" />
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
                    onClick={handleClose}
                    disabled={removingId !== null}>
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default RemoveFriendModal;

