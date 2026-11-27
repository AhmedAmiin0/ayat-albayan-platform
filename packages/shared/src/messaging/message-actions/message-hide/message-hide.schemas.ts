import { id, phoneE164 } from '@ab/core';
import { z } from 'zod';

/** One WhatsApp message of a chat: `:phone` any spelling of an E.164 number, the id a uuid. */
export const messageHideParamsSchema = z.object({ phone: phoneE164, messageId: id() });
export type MessageHideParams = z.infer<typeof messageHideParamsSchema>;
