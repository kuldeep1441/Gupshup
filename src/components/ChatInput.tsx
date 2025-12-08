"use client";

import axios from "axios";
import { FC, useRef, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import TextareaAutosize from "react-textarea-autosize";
import Button from "./common/Button";
import { Message } from "@/lib/validations/message";
import { nanoid } from "nanoid";

interface ExtendedMessage extends Message {
  status?: "pending" | "sent" | "failed";
  tempId?: string;
}

interface ChatInputProps {
  chatId: string;
  chatName: string;
  sessionId: string;
  onMessageSent?: (message: ExtendedMessage) => void;
  onStatusUpdate?: (messageId: string, status: "pending" | "sent" | "failed") => void;
}

const ChatInput: FC<ChatInputProps> = ({ chatId, chatName, sessionId, onMessageSent, onStatusUpdate }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");

  const sendMessage = async (retryMessageId?: string, retryText?: string) => {
    const messageText = retryText || input.trim();
    if (!messageText) return;
    
    setIsLoading(true);

    // Create optimistic message with temporary ID
    const tempId = retryMessageId || nanoid();
    const tempTimestamp = Date.now();
    const optimisticMessage: ExtendedMessage = {
      id: tempId,
      chatId,
      senderId: sessionId,
      text: messageText,
      timestamp: tempTimestamp,
      status: "pending",
      tempId: tempId,
    };

    // Add message optimistically so sender sees it immediately
    if (onMessageSent) {
      onMessageSent(optimisticMessage);
    }

    // Clear input immediately for better UX (only if not retrying)
    if (!retryMessageId) {
      setInput("");
      textareaRef.current?.focus();
    }

    try {
      const response = await axios.post("/api/message/send", { text: messageText, chatId });
      // Check if Pusher quota was exceeded
      if (response.data?.pusherQuotaExceeded) {
        toast.error("Message saved! Real-time delivery is temporarily unavailable. Please refresh to see new messages.", {
          duration: 5000,
        });
        // Mark as sent but let user know they need to refresh
        if (onStatusUpdate) {
          onStatusUpdate(tempId, "sent");
        }
      } else {
        // Mark as sent - will be replaced by Pusher message with real ID
        if (onStatusUpdate) {
          onStatusUpdate(tempId, "sent");
        }
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      
      // Check for Pusher quota error in response
      if (err.response?.data?.pusherQuotaExceeded || err.response?.data?.message?.includes("quota")) {
        toast.error("Message saved but real-time delivery unavailable. Please refresh to see new messages.", {
          duration: 5000,
        });
        // Mark as sent since message was saved to Redis
        if (onStatusUpdate) {
          onStatusUpdate(tempId, "sent");
        }
      } else {
        toast.error("Failed to send message. Click retry to try again.");
        // Mark message as failed
        if (onStatusUpdate) {
          onStatusUpdate(tempId, "failed");
        }
        // Restore input on error (only if not retrying)
        if (!retryMessageId) {
          setInput(messageText);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Expose retry function globally so Messages component can call it
  useEffect(() => {
    (window as any).retryMessage = (messageId: string, text: string) => {
      sendMessage(messageId, text);
    };
    return () => {
      delete (window as any).retryMessage;
    };
  }, [sendMessage]);

  return (
    <div className="border-t border-gray-200 px-4 pt-4 mb-2 sm:mb-0">
      <div className="relative flex-1 overflow-hidden rounded-lg shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-600">
        <TextareaAutosize
          ref={textareaRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${chatName}`}
          className="block w-full resize-none border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:py-1.5 sm:text-sm sm:leading-6"
        />

        <div
          onClick={() => textareaRef.current?.focus()}
          className="py-2"
          aria-hidden="true">
          <div className="py-px">
            <div className="h-9" />
          </div>
        </div>

        <div className="absolute right-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
          <div className="flex-shrin-0">
            <Button isLoading={isLoading} onClick={() => sendMessage()} type="submit">
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
