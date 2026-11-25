import { z } from 'zod';
import { CHANNEL_MESSAGE_KINDS, type ChannelMessageKind } from './channel-media';
import type {
  ChannelMessageView,
  ChannelPage,
  ChannelReads,
  ChannelSenderLabel,
} from './channel-views';
import {
  CHANNEL_CLOSED_REASONS,
  CHANNEL_SENDER_ROLES,
  type ChannelClosedReason,
} from './channel';

// The apps' parse of the channel's answers (docs/36 Z-5). Typed by the views, so a field added
// there fails to compile here until the schema reads it too. Lenient on purpose (an app and the
// API ship apart): a field this app does not know yet is ignored, a field an older API does not
// send yet gets its default, and a role or kind this app does not know reads as 'unknown' / text.

/** A known value of `list`, else `fallback`. */
const oneOf = <T extends string, F extends string>(list: readonly T[], fallback: F) =>
  z.string().transform((v): T | F => list.find((x) => x === v) ?? fallback);

const senderRole: z.ZodType<ChannelSenderLabel> = oneOf(CHANNEL_SENDER_ROLES, 'unknown');
const kind: z.ZodType<ChannelMessageKind> = oneOf(CHANNEL_MESSAGE_KINDS, 'text');

const attachmentSchema = z.object({
  mime: z.string(),
  size: z.number(),
  name: z.string().catch(''),
  duration_ms: z.number().nullable().catch(null),
  url: z.string().nullable().catch(null),
});

const replySchema = z.object({
  id: z.string(),
  sender_name: z.string().catch(''),
  sender_role: senderRole,
  body: z.string().catch(''),
  kind: kind.catch('text'),
  deleted: z.boolean().catch(false),
});

export const channelMessageViewSchema: z.ZodType<ChannelMessageView> = z.object({
  id: z.string(),
  body: z.string(),
  sender_role: senderRole,
  sender_name: z.string(),
  mine: z.boolean(),
  created_at: z.string(),
  edited: z.boolean(),
  deleted: z.boolean(),
  kind: kind.catch('text'),
  attachment: attachmentSchema.nullable().catch(null),
  reply_to: replySchema.nullable().catch(null),
  read_by_all: z.boolean().catch(false),
  client_id: z.string().nullable().catch(null),
});

const closedReason: z.ZodType<ChannelClosedReason | null> = z
  .enum(CHANNEL_CLOSED_REASONS)
  .nullable()
  .catch(null);

/** GET …/messages: one page of a student channel, oldest first. */
export const channelPageSchema: z.ZodType<ChannelPage> = z.object({
  student_name: z.string(),
  messages: z.array(channelMessageViewSchema),
  has_more: z.boolean(),
  read_only: z.boolean(),
  open: z.boolean(),
  closed_reason: closedReason,
  channel_id: z.string(),
  participants: z
    .array(z.object({ name: z.string().catch(''), role: senderRole, me: z.boolean().catch(false) }))
    .catch([]),
  my_last_read_at: z.string().nullable().catch(null),
});

/** GET …/messages/:messageId/reads. */
export const channelReadsSchema: z.ZodType<ChannelReads> = z.object({
  read: z.array(z.object({ name: z.string(), role: senderRole, at: z.string() })),
  unread: z.array(z.object({ name: z.string(), role: senderRole })),
});

/**
 * GET / PUT /sales/students/:id/channel/seat: any assistant may take the channel's seat, but only
 * one holds it at a time. Who holds the one assistant seat (a name only, never a phone
 * or email; null = free, a holder who is no longer an assistant too), whether it is mine, whether
 * I brought the student (priority: she takes it from anyone) and whether I may take it now.
 */
export const channelSeatSchema = z.object({
  holder: z.object({ id: z.string(), name: z.string() }).nullable(),
  mine: z.boolean(),
  bringer: z.boolean(),
  canTake: z.boolean(),
});
export type ChannelSeat = z.infer<typeof channelSeatSchema>;
