"use client";

import { addFriendValidator } from "@/lib/validations/add-friend";
import axios, { AxiosError } from "axios";
import { FC, Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import Button from "./common/Button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillEmail?: string;
}

type FormData = z.infer<typeof addFriendValidator>;

/**
 * Modal component for adding a friend by email.
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 */
const AddFriendModal: FC<AddFriendModalProps> = ({ isOpen, onClose, prefillEmail }) => {
  const [showSuccessState, setShowSuccessState] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(addFriendValidator),
  });

  // Pre-fill email if provided
  useEffect(() => {
    if (prefillEmail && isOpen) {
      setValue("email", prefillEmail);
    }
  }, [prefillEmail, isOpen, setValue]);

  /**
   * Handles adding a friend by email.
   * 
   * @param email - The email address of the friend to add
   */
  const addFriend = async (email: string) => {
    try {
      const validatedEmail = addFriendValidator.parse({ email });

      await axios.post("/api/friends/add", {
        email: validatedEmail,
      });

      setShowSuccessState(true);
      toast.success("Friend request sent!");
      
      // Reset form and close modal after a short delay
      setTimeout(() => {
        reset();
        setShowSuccessState(false);
        onClose();
      }, 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError("email", { message: error.errors[0]?.message });
        return;
      }

      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data || "Something went wrong.";
        setError("email", { message: errorMessage });
        toast.error(errorMessage);
        return;
      }

      setError("email", { message: "Something went wrong." });
      toast.error("Something went wrong.");
    }
  };

  const onSubmit = (data: FormData) => {
    addFriend(data.email);
  };

  const handleClose = () => {
    reset();
    setShowSuccessState(false);
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
                    Add Friend
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium leading-6 text-gray-900">
                    Add friend by E-Mail
                  </label>

                  <div className="mt-2">
                    <input
                      {...register("email")}
                      type="text"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                  
                  {showSuccessState && (
                    <p className="mt-1 text-sm text-green-600">
                      Friend request sent!
                    </p>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClose}
                      disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send Request"}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddFriendModal;

