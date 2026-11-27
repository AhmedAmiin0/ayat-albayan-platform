import { z } from 'zod';
import { messageViewSchema } from '../../chat/message-view';

/**
 * A text send's row, and whether its request id replayed the first row; for a correction,
 * whether that first row is this very request (docs/44 BUG7).
 */
export const textSendAnswerSchema = messageViewSchema.extend({
  replayed: z.boolean(),
  same_request: z.boolean(),
});

export type TextSendAnswer = z.infer<typeof textSendAnswerSchema>;
