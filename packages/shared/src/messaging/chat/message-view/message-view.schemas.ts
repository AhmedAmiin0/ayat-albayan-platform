import { id, instant, phoneE164 } from '@ab/core';
import { messageDirectionSchema, messageStatusSchema, numberPurposeSchema } from '@ab/catalog';
import { z } from 'zod';
import {
  messageHiddenSchema,
  messageLessonSchema,
  messageReactionsSchema,
  messageTemplateBlockSchema,
  replyQuoteSchema,
  templateParamsSchema,
} from './message-parts.schemas';

const at = instant.nullable();
const text = z.string().nullable();

/** The marks of a hidden, edited, deleted or correcting message; absent in an old cache = no. */
const marks = {
  hidden: messageHiddenSchema.nullable().optional(),
  corrects_id: id().nullable().optional(),
  sent_by_id: id().nullable().optional(),
  edited: z.boolean().optional(),
  deleted: z.boolean().optional(),
};

/**
 * One messages row in a thread (R-MSG-05). The optional fields are absent in an old cache; a
 * template row's body is the rendered text and `click_to_chat` is set only on outbound queued or
 * failed rows (R-MSG-03). `interactive_payload` is Meta's own JSON, passed through as stored.
 */
export const messageViewSchema = z.object({
  ...marks,
  id: id(),
  direction: messageDirectionSchema,
  status: messageStatusSchema,
  phone_e164: phoneE164,
  lead_id: id().nullable(),
  guardian_id: id().nullable(),
  lesson_id: id().nullable(),
  template_key: text,
  template_params: templateParamsSchema.nullable(),
  template: messageTemplateBlockSchema.nullable().optional(),
  body: text,
  media_mime: text,
  media_url: text,
  media_name: text.optional(),
  reply_to_wa_id: text,
  reply_to_message_id: id().nullable().optional(),
  reply_to: replyQuoteSchema.nullable().optional(),
  replyable: z.boolean().optional(),
  forwardable: z.boolean().optional(),
  forwarded: z.boolean().optional(),
  reactions: messageReactionsSchema.optional(),
  interactive_payload: z.unknown(),
  error_code: text,
  error_text: text,
  attempts: z.number().int().nonnegative(),
  next_attempt_at: at,
  scheduled_for: at,
  sent_at: at,
  delivered_at: at,
  read_at: at,
  sent_manually_at: at,
  app_send_until: at.optional(),
  /** Old: read sender_name (D4); still filled for old mobile builds and cached rows. */
  sent_by_teacher_name: text.optional(),
  sender_name: text.optional(),
  automatic: z.boolean().optional(),
  line: numberPurposeSchema.nullable().optional(),
  created_at: instant,
  click_to_chat: text,
  lesson: messageLessonSchema.nullable(),
});
export type MessageView = z.infer<typeof messageViewSchema>;
