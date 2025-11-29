"use client";

import { FC, useRef, useState } from "react";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import { Message } from "@/lib/validations/message";

interface ExtendedMessage extends Message {
  status?: "pending" | "sent" | "failed";
  tempId?: string;
}

interface ChatWrapperProps {
  chatId: string;
  participants: User[];
  sessionImg: string | null | undefined;
  sessionId: string;
  initialMessages: Message[];
  chatName: string;
}

/**
 * Wrapper component that connects ChatInput and Messages to enable optimistic updates.
 * When a message is sent, it's immediately added to the Messages component before the API call completes.
 */
const ChatWrapper: FC<ChatWrapperProps> = ({
  chatId,
  participants,
  sessionImg,
  sessionId,
  initialMessages,
  chatName,
}) => {
  const optimisticMessageHandlerRef = useRef<((message: ExtendedMessage) => void) | null>(null);
  const statusUpdateHandlerRef = useRef<((messageId: string, status: "pending" | "sent" | "failed") => void) | null>(null);

  /**
   * Handles adding a message optimistically when the user sends it.
   * This ensures the sender sees their message immediately.
   * 
   * @param message - The message to add optimistically
   */
  const handleMessageSent = (message: ExtendedMessage) => {
    if (optimisticMessageHandlerRef.current) {
      optimisticMessageHandlerRef.current(message);
    }
  };

  /**
   * Handles updating message status (pending -> sent/failed).
   * 
   * @param messageId - The ID of the message to update
   * @param status - The new status
   */
  const handleStatusUpdate = (messageId: string, status: "pending" | "sent" | "failed") => {
    if (statusUpdateHandlerRef.current) {
      statusUpdateHandlerRef.current(messageId, status);
    }
  };

  return (
    <>
      <Messages
        chatId={chatId}
        participants={participants}
        sessionImg={sessionImg}
        sessionId={sessionId}
        initialMessages={initialMessages}
        onOptimisticMessage={(handler) => {
          optimisticMessageHandlerRef.current = handler;
        }}
        onMessageStatusUpdate={(handler) => {
          statusUpdateHandlerRef.current = handler;
        }}
      />
      <ChatInput
        chatId={chatId}
        chatName={chatName}
        sessionId={sessionId}
        onMessageSent={handleMessageSent}
        onStatusUpdate={handleStatusUpdate}
      />
    </>
  );
};

export default ChatWrapper;

