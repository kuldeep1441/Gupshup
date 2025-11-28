import { z } from "zod";

export const messageValidator = z.object({
  id: z.string(),
  /**
   * Identifier of the chat/group this message belongs to.
   */
  chatId: z.string(),
  senderId: z.string(),
  text: z.string(),
  timestamp: z.number(),
});

export const messageArrayValidator = z.array(messageValidator);

export type Message = z.infer<typeof messageValidator>;
