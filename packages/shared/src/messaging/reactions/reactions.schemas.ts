import { messageStatusSchema } from '@ab/catalog';
import { z } from 'zod';
import { messageViewSchema } from '../chat/message-view';

/**
 * The PUT's answer: the reacted message as it is now, and how the send went (a failed one is
 * already reverted).
 */
export const reactionResultSchema = z.object({
  message: messageViewSchema,
  status: messageStatusSchema,
  error_code: z.string().nullable(),
  error_text: z.string().nullable(),
});
export type ReactionResult = z.infer<typeof reactionResultSchema>;
