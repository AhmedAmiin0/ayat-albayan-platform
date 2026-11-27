import { LEAD_SOURCES, LEAD_STATUSES } from '@ab/catalog';
import {
  messageDirectionSchema,
  messageStatusSchema,
  numberPurposeSchema,
  waLineSchema,
} from '@ab/catalog';
import { id, instant, phoneE164 } from '@ab/core';
import { z } from 'zod';

export const familyRingSchema = z.enum(['subscribed', 'renewal']);
export const subscriptionBadgeSchema = z.enum(['subscribed', 'expired', 'none']);
export const messageNoteSchema = z.enum(['deleted', 'ad_welcome', 'unsupported']);
export const reopenChoiceSchema = z.enum(['template', 'wait']);

export const reopenSentSchema = z.object({
  id: id(),
  template_key: z.string(),
  status: messageStatusSchema,
});

const text = z.string().nullable();

/** Fields a thread row gains from the API; each is absent in an old cache. */
const extras = {
  last_note: messageNoteSchema.nullable().optional(),
  ring: familyRingSchema.nullable().optional(),
  badge: subscriptionBadgeSchema.nullable().optional(),
  /** familyUnpaid: a running package still owes money. */
  unpaid: z.boolean().optional(),
  /** The last message is Meta's `unsupported`: its content never reached the academy. */
  last_unsupported: z.boolean().optional(),
  /** The newest inbound's line (docs/12 §13); null = history or a single line. */
  last_inbound_line: numberPurposeSchema.nullable().optional(),
  last_chat_inbound_at: instant.nullable().optional(),
  last_notifications_inbound_at: instant.nullable().optional(),
  /** replyLine(): the line a session text leaves from; null when closed or on a single line. */
  reply_line: waLineSchema.nullable().optional(),
  /** Thread page only: its send line can react (not the CRM line, not a closed window). */
  reactable: z.boolean().optional(),
  /** Kapso chat line: after the window a staff text is held; reopen_choice: what asks a reply. */
  try_after_window: z.boolean().optional(),
  reopen_choice: reopenChoiceSchema.optional(),
  /** Thread page, window closed: the reopen template live for this phone. */
  reopen_sent: reopenSentSchema.nullable().optional(),
  /** The academy's `chat_reopen_template`, the picker's preselected key. */
  reopen_template: z.string().optional(),
};

/**
 * One chat in the inbox (docs/12 §4 H1): a v_threads row plus the 24 h window at response time.
 * `display_name` null = an unknown number; `unread_count` is a teacher's own for a teacher.
 */
export const threadViewSchema = z.object({
  ...extras,
  phone_e164: phoneE164,
  display_name: text,
  last_message_id: id(),
  last_direction: messageDirectionSchema,
  last_body: text,
  last_template_key: text,
  last_status: messageStatusSchema,
  last_media_mime: text,
  last_message_at: instant,
  last_inbound_at: instant.nullable(),
  unread_count: z.number().int().nonnegative(),
  lead_id: id().nullable(),
  lead_name: text,
  lead_status: z.enum(LEAD_STATUSES).nullable(),
  lead_source: z.enum(LEAD_SOURCES).nullable(),
  guardian_id: id().nullable(),
  guardian_name: text,
  guardian_tz: text,
  teacher_id: id().nullable(),
  teacher_name: text,
  /** sessionWindowOpen(last_inbound_at, now): free text allowed, else a template. */
  session_open: z.boolean(),
  /** subscriptionBadge of the guardian's students is 'subscribed'. */
  subscribed: z.boolean(),
});
export type ThreadView = z.infer<typeof threadViewSchema>;
