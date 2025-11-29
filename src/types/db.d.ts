interface User {
  name: string;
  email: string;
  image: string;
  id: string;
}

/**
 * Represents a chat "group". This can be a 1-to-1 chat or a multi-user group.
 * Even two-person conversations are modeled as a group of two members.
 */
interface Chat {
  /**
   * Unique identifier for this chat/group.
   */
  id: string;

  /**
   * Human readable name for the chat / group.
   * For 1-to-1 conversations this can be generated from the other user's name.
   */
  name: string;

  /**
   * All users that are members of this chat (including the current user).
   */
  memberIds: string[];

  /**
   * Creation timestamp in milliseconds since epoch.
   * Only set for groups (not for individual chats created via message sending).
   */
  createdAt?: number;
}

/**
 * Message stored in a chat. Every message is always associated to a single chat.
 */
interface Message {
  /**
   * Unique identifier of the message.
   */
  id: string;

  /**
   * The chat this message belongs to.
   */
  chatId: string;

  /**
   * The user that sent this message.
   */
  senderId: string;

  /**
   * Message body as plain text.
   */
  text: string;

  /**
   * Milliseconds since epoch, used for ordering.
   */
  timestamp: number;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
}
