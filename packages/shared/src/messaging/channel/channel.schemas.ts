import { z } from 'zod';
import { CHANNEL_SENDER_ROLES, type ChannelMessageView, type ChannelPage } from './channel.js';

// The apps' parse of a thread page (docs/36 Z-5). Typed by the views in channel.ts, so a field
// added there fails to compile here until the schema reads it too.

const channelMessageViewSchema: z.ZodType<ChannelMessageView> = z.object({
  id: z.string(),
  body: z.string(),
  sender_role: z.enum(CHANNEL_SENDER_ROLES),
  sender_name: z.string(),
  mine: z.boolean(),
  created_at: z.string(),
  edited: z.boolean(),
  deleted: z.boolean(),
});

/** GET …/messages: one page of a student channel, oldest first. */
export const channelPageSchema: z.ZodType<ChannelPage> = z.object({
  student_name: z.string(),
  messages: z.array(channelMessageViewSchema),
  has_more: z.boolean(),
  read_only: z.boolean(),
  open: z.boolean(),
  channel_id: z.string(),
});

/**
 * GET / PUT /sales/students/:id/channel/seat (owner 2026-11-16 «any assistant can subscribe to
 * the chating channel but only 1»): who holds the one assistant seat (a name only, never a phone
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
