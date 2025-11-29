"use client";

import { pusherClient } from "@/lib/pusher";
import { cn, toPusherKey } from "@/lib/utils";
import { Message } from "@/lib/validations/message";
import { format } from "date-fns";
import Image from "next/image";
import { FC, useEffect, useRef, useState } from "react";
import { Edit2, X, Check, RotateCcw } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

interface ExtendedMessage extends Message {
  status?: "pending" | "sent" | "failed";
  tempId?: string; // For optimistic messages
}

interface MessagesProps {
  initialMessages: Message[];
  sessionId: string;
  chatId: string;
  sessionImg: string | null | undefined;
  participants: User[];
  onOptimisticMessage?: (handler: (message: ExtendedMessage) => void) => void;
  onMessageStatusUpdate?: (handler: (messageId: string, status: "pending" | "sent" | "failed") => void) => void;
}

const Messages: FC<MessagesProps> = ({
  initialMessages,
  sessionId,
  chatId,
  participants,
  sessionImg,
  onOptimisticMessage,
  onMessageStatusUpdate,
}) => {
  const [messages, setMessages] = useState<ExtendedMessage[]>(
    initialMessages.map((msg) => ({ ...msg, status: "sent" as const }))
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [originalMessageText, setOriginalMessageText] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const editingMessageIdRef = useRef<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    editingMessageIdRef.current = editingMessageId;
  }, [editingMessageId]);

  // Register optimistic message handler
  useEffect(() => {
    if (onOptimisticMessage) {
      const handleOptimistic = (message: ExtendedMessage) => {
        setMessages((prev) => {
          const messageExists = prev.some((msg) => msg.id === message.id || msg.tempId === message.tempId);
          if (messageExists) {
            return prev;
          }
          return [{ ...message, status: "pending" }, ...prev];
        });
      };
      // Expose handler to parent
      onOptimisticMessage(handleOptimistic);
    }
  }, [onOptimisticMessage]);

  // Register message status update handler
  useEffect(() => {
    if (onMessageStatusUpdate) {
      const handleStatusUpdate = (messageId: string, status: "pending" | "sent" | "failed") => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId || msg.tempId === messageId
              ? { ...msg, status }
              : msg
          )
        );
      };
      // Expose handler to parent
      onMessageStatusUpdate(handleStatusUpdate);
    }
  }, [onMessageStatusUpdate]);

  // Only sync initialMessages on mount or when chatId changes (new chat)
  // Don't reset on every initialMessages change to avoid interfering with Pusher updates
  const chatIdRef = useRef<string>(chatId);
  useEffect(() => {
    if (chatIdRef.current !== chatId) {
      // New chat - reset messages
      chatIdRef.current = chatId;
      setMessages(initialMessages.map((msg) => ({ ...msg, status: "sent" as const })));
    }
  }, [chatId, initialMessages]);

  useEffect(() => {
    const channelName = toPusherKey(`chat:${chatId}`);
    console.log(`[Messages] Setting up Pusher subscription for channel: ${channelName} for chatId: ${chatId}`);
    console.log(`[Messages] Current Pusher connection state: ${pusherClient.connection.state}`);
    
    // Ensure Pusher client is connected
    if (pusherClient.connection.state === "disconnected" || pusherClient.connection.state === "failed") {
      console.log("[Messages] Pusher disconnected, attempting to reconnect...");
      pusherClient.connect();
    }

    // Subscribe to channel - Pusher will queue events if subscription isn't ready yet
    const channel = pusherClient.subscribe(channelName);
    console.log(`[Messages] Channel subscription initiated for: ${channelName}, subscribed: ${channel.subscribed}`);

    // Track subscription state
    let isSubscribed = channel.subscribed;
    let cleanupFunctions: (() => void)[] = [];

    const messageHandler = (message: Message) => {
      console.log(`[Messages] 📨 Received message via Pusher:`, {
        messageId: message.id,
        text: message.text,
        senderId: message.senderId,
        chatId: message.chatId,
        timestamp: message.timestamp,
        expectedChatId: chatId,
        channelName: channelName,
        subscriptionState: channel.subscribed ? "subscribed" : "not subscribed",
      });
      
      // Verify this message is for the current chat
      if (message.chatId !== chatId) {
        console.warn(`[Messages] ⚠️ Received message for different chatId. Expected: ${chatId}, Got: ${message.chatId}`);
        console.warn(`[Messages] Message details:`, { 
          messageChatId: message.chatId, 
          currentChatId: chatId, 
          senderId: message.senderId,
          currentUserId: sessionId,
          messageId: message.id 
        });
        return;
      }
      
      // Additional validation: ensure message is not from current user (should be handled by optimistic update)
      // But don't block it - just log for debugging
      if (message.senderId === sessionId) {
        console.log(`[Messages] 📤 Received own message via Pusher (this is normal for confirmation):`, message.id);
      }

      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some((msg) => msg.id === message.id);
        if (messageExists) {
          console.log(`[Messages] ⏭️ Message ${message.id} already exists, skipping duplicate`);
          return prev;
        }
        
        // Check for optimistic message that should be replaced
        // Look for a pending message with same text, same sender, and timestamp within 2 seconds
        const optimisticMessageIndex = prev.findIndex(
          (msg) =>
            msg.status === "pending" &&
            msg.text === message.text &&
            msg.senderId === message.senderId &&
            Math.abs(msg.timestamp - message.timestamp) < 2000 &&
            msg.id !== message.id
        );
        
        if (optimisticMessageIndex !== -1) {
          // Replace optimistic message with real one from server and mark as sent
          console.log(`[Messages] 🔄 Replacing optimistic message with real one (id: ${message.id})`);
          const newMessages = [...prev];
          newMessages[optimisticMessageIndex] = { ...message, status: "sent" };
          return newMessages;
        }
        
        // Add new message from Pusher (for receiver) - mark as sent
        console.log(`[Messages] ✅ Adding new message from Pusher for receiver (id: ${message.id}, sender: ${message.senderId}, current user: ${sessionId})`);
        return [{ ...message, status: "sent" }, ...prev];
      });
    };

    const messageEditedHandler = (editedMessage: Message) => {
      console.log("Received message edit via Pusher:", editedMessage);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editedMessage.id ? editedMessage : msg
        )
      );
      // If we're editing this message, exit edit mode
      // Use ref to get current value since closure might be stale
      if (editingMessageIdRef.current === editedMessage.id) {
        setEditingMessageId(null);
        setEditText("");
        setOriginalMessageText("");
      }
    };

    const subscriptionSucceededHandler = () => {
      isSubscribed = true;
      console.log(`[Messages] ✅ Successfully subscribed to channel: ${channelName} for chatId: ${chatId}`);
      console.log(`[Messages] Channel subscription state: ${channel.subscribed}`);
      // Channel is now ready to receive messages
    };

    const subscriptionErrorHandler = (error: any) => {
      isSubscribed = false;
      console.error(`[Messages] ❌ Error subscribing to channel ${channelName}:`, error);
    };

    // Handle connection state changes
    const connectionStateHandler = ({ current, previous }: { current: string; previous: string }) => {
      console.log(`Pusher connection state changed from ${previous} to ${current} for chatId: ${chatId}`);
      if (current === "connected") {
        console.log(`Pusher connected, channel ${channelName} should be ready`);
      }
    };

    const connectedHandler = () => {
      console.log(`[Messages] Pusher client connected for chatId: ${chatId}`);
      // When reconnected, verify channel subscription is active
      // Pusher automatically resubscribes, but we can verify
      if (!channel.subscribed) {
        console.log(`[Messages] Channel ${channelName} not subscribed after reconnection, resubscribing...`);
        // The channel should auto-resubscribe, but we can check
        setTimeout(() => {
          if (!channel.subscribed && pusherClient.connection.state === "connected") {
            console.warn(`[Messages] ⚠️ Channel ${channelName} still not subscribed after reconnection`);
          } else {
            console.log(`[Messages] ✅ Channel ${channelName} subscription restored after reconnection`);
          }
        }, 1000);
      } else {
        console.log(`[Messages] ✅ Channel ${channelName} subscription maintained after reconnection`);
      }
    };

    const disconnectedHandler = () => {
      console.log(`Pusher client disconnected for chatId: ${chatId}`);
    };

    const errorHandler = (error: any) => {
      console.error(`[Messages] ❌ Pusher connection error for chatId ${chatId}:`, error);
      
      // Log detailed error information
      if (error?.error) {
        console.error(`[Messages] Error details for chatId ${chatId}:`, {
          type: error.type,
          error: error.error,
          message: error.error?.message || error.error?.type || "Unknown error",
        });
      }
      
      // Handle WebSocket errors - these are usually recoverable
      if (error?.type === "WebSocketError" || error?.error?.type === "WebSocketError") {
        console.warn(`[Messages] ⚠️ WebSocket error for chatId ${chatId} - Pusher will attempt to reconnect automatically`);
        console.warn(`[Messages] Messages may be delayed until reconnection succeeds`);
        
        // Try to resubscribe if connection recovers
        const checkAndResubscribe = () => {
          if (pusherClient.connection.state === "connected" && !channel.subscribed) {
            console.log(`[Messages] Reconnection detected, resubscribing to channel ${channelName}...`);
            // Channel subscription should happen automatically, but we can verify
          }
        };
        
        // Check every 2 seconds for reconnection
        const resubscribeInterval = setInterval(() => {
          if (pusherClient.connection.state === "connected") {
            checkAndResubscribe();
            clearInterval(resubscribeInterval);
          }
        }, 2000);
        
        // Clean up after 30 seconds
        setTimeout(() => clearInterval(resubscribeInterval), 30000);
      }
    };

    // Bind connection state handlers
    pusherClient.connection.bind("state_change", connectionStateHandler);
    pusherClient.connection.bind("connected", connectedHandler);
    pusherClient.connection.bind("disconnected", disconnectedHandler);
    pusherClient.connection.bind("error", errorHandler);

    // Bind subscription lifecycle events FIRST
    channel.bind("pusher:subscription_succeeded", subscriptionSucceededHandler);
    channel.bind("pusher:subscription_error", subscriptionErrorHandler);

    // Bind event handlers - Bind immediately, Pusher will queue events if subscription isn't ready yet
    channel.bind("incoming-message", messageHandler);
    channel.bind("message_edited", messageEditedHandler);

    // If already subscribed, trigger success handler manually
    if (channel.subscribed) {
      console.log(`[Messages] Channel ${channelName} already subscribed, marking as ready`);
      isSubscribed = true;
      subscriptionSucceededHandler();
    }

    // Wait a bit and check if subscription is ready
    const checkSubscription = setInterval(() => {
      if (!isSubscribed && channel.subscribed) {
        console.log(`[Messages] Channel ${channelName} subscription confirmed after wait`);
        isSubscribed = true;
        subscriptionSucceededHandler();
        clearInterval(checkSubscription);
      }
    }, 100);

    // Clean up interval after 5 seconds
    setTimeout(() => {
      clearInterval(checkSubscription);
    }, 5000);

    return () => {
      console.log(`[Messages] 🧹 Cleaning up Pusher subscription for channel: ${channelName}`);
      // Clear any pending subscription checks
      // Unbind all event handlers
      channel.unbind("incoming-message", messageHandler);
      channel.unbind("message_edited", messageEditedHandler);
      channel.unbind("pusher:subscription_succeeded", subscriptionSucceededHandler);
      channel.unbind("pusher:subscription_error", subscriptionErrorHandler);
      
      // Unbind connection handlers
      pusherClient.connection.unbind("state_change", connectionStateHandler);
      pusherClient.connection.unbind("connected", connectedHandler);
      pusherClient.connection.unbind("disconnected", disconnectedHandler);
      pusherClient.connection.unbind("error", errorHandler);
      
      // Unsubscribe from channel
      try {
        pusherClient.unsubscribe(channelName);
        console.log(`[Messages] Unsubscribed from channel: ${channelName}`);
      } catch (error) {
        console.error(`[Messages] Error unsubscribing from channel ${channelName}:`, error);
      }
    };
  }, [chatId, sessionId]);

  const scrollDownRef = useRef<HTMLDivElement | null>(null);

  const formatTimestamp = (timestamp: number) => {
    return format(timestamp, "HH:mm");
  };

  /**
   * Handles starting the edit mode for a message.
   * 
   * @param messageId - The ID of the message to edit
   * @param currentText - The current text of the message
   */
  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditText(currentText);
    setOriginalMessageText(currentText); // Store original text for potential rollback
    // Focus the input after a brief delay to ensure it's rendered
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  /**
   * Handles canceling the edit mode.
   */
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
    setOriginalMessageText("");
  };

  /**
   * Handles saving the edited message.
   * 
   * @param messageId - The ID of the message being edited
   */
  const handleSaveEdit = async (messageId: string) => {
    const trimmedText = editText.trim();
    if (trimmedText.length === 0) {
      toast.error("Message cannot be empty");
      return;
    }

    // Store original text for potential rollback
    const originalText = originalMessageText;

    // Optimistically update the message text in the UI immediately
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, text: trimmedText } : msg
      )
    );

    // Hide buttons immediately by clearing editing state
    setEditingMessageId(null);
    setEditText("");
    setOriginalMessageText("");

    try {
      await axios.post("/api/message/edit", {
        messageId,
        chatId,
        text: trimmedText,
      });
      toast.success("Message updated");
    } catch (error) {
      // Error: Revert to original text and restore edit mode
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, text: originalText } : msg
        )
      );
      // Restore edit mode so user can try again
      setEditingMessageId(messageId);
      setEditText(originalText);
      setOriginalMessageText(originalText);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data || "Failed to update message");
      } else {
        toast.error("Failed to update message");
      }
    }
  };

  return (
    <div
      id="messages"
      className="flex flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch min-h-0">
      <div ref={scrollDownRef} />

      {messages.map((message, index) => {
        const isCurrentUser = message.senderId === sessionId;
        const sender =
          participants.find((user) => user.id === message.senderId) ??
          participants[0];

        const hasNextMessageFromSameUser =
          messages[index - 1]?.senderId === messages[index].senderId;

        const isEditing = editingMessageId === message.id;
        const isHovered = hoveredMessageId === message.id;

        return (
          <div
            className="chat-message group relative"
            key={`${message.id}-${message.timestamp}`}
            onMouseEnter={() => isCurrentUser && setHoveredMessageId(message.id)}
            onMouseLeave={() => setHoveredMessageId(null)}>
            <div
              className={cn("flex items-end", {
                "justify-end": isCurrentUser,
              })}>
              <div
                className={cn(
                  "flex flex-col space-y-2 text-base max-w-xs mx-2 relative",
                  {
                    "order-1 items-end": isCurrentUser,
                    "order-2 items-start": !isCurrentUser,
                  }
                )}>
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit(message.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg flex-1 text-sm",
                        {
                          "bg-indigo-600 text-white": isCurrentUser,
                          "bg-gray-200 text-gray-900": !isCurrentUser,
                        }
                      )}
                    />
                    <button
                      onClick={() => handleSaveEdit(message.id)}
                      className="p-1.5 rounded-full hover:bg-green-100 text-green-600 transition-colors"
                      aria-label="Save edit">
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                      aria-label="Cancel edit">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    {isCurrentUser && isHovered && message.status !== "failed" && (
                      <button
                        onClick={() => handleStartEdit(message.id, message.text)}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white shadow-md hover:bg-gray-100 text-gray-600 transition-all z-10"
                        aria-label="Edit message">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isCurrentUser && message.status === "failed" && (
                      <button
                        onClick={() => {
                          // Retry sending the message
                          const retryHandler = (window as any).retryMessage;
                          if (retryHandler) {
                            retryHandler(message.tempId || message.id, message.text);
                          }
                        }}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white shadow-md hover:bg-orange-100 text-orange-600 transition-all z-10"
                        aria-label="Retry sending message">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span
                      className={cn("px-4 py-2 rounded-lg inline-block", {
                        "bg-indigo-600 text-white": isCurrentUser,
                        "bg-gray-200 text-gray-900": !isCurrentUser,
                        "rounded-br-none":
                          !hasNextMessageFromSameUser && isCurrentUser,
                        "rounded-bl-none":
                          !hasNextMessageFromSameUser && !isCurrentUser,
                        "opacity-70": message.status === "pending",
                      })}>
                      {message.text}{" "}
                      <span className="ml-2 text-xs text-gray-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div
                className={cn("relative w-6 h-6", {
                  "order-2": isCurrentUser,
                  "order-1": !isCurrentUser,
                  invisible: hasNextMessageFromSameUser,
                })}>
                <Image
                  fill
                  src={
                    isCurrentUser
                      ? (sessionImg as string)
                      : (sender?.image as string)
                  }
                  alt="Profile picture"
                  referrerPolicy="no-referrer"
                  className="rounded-full"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Messages;

