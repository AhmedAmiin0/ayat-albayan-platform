import { z } from 'zod';

// The student channel (docs/31 §2): an in-platform text chat between a student's family and the student's
// current teacher(s), read-only for monitors (the owning assistant, student_channels.monitor). Never on
// WhatsApp. Views are whitelists: names only, never a phone, email or profile id.

/** channel_messages.body check (migration 800), after trimming. */
export const CHANNEL_BODY_MAX = 2000;

/** One page of a thread (`?before=` pages back). */
export const CHANNEL_PAGE_SIZE = 50;

/** POST …/messages. */
export const channelPostSchema = z.object({
  body: z.string().trim().min(1).max(CHANNEL_BODY_MAX),
});
export type ChannelPost = z.output<typeof channelPostSchema>;

/** GET …/messages?before=<iso>. */
export const channelPageQuerySchema = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
});

export const CHANNEL_SENDER_ROLES = ['teacher', 'guardian', 'student'] as const;
export type ChannelSenderRole = (typeof CHANNEL_SENDER_ROLES)[number];

export interface ChannelMessageView {
  id: string;
  body: string;
  sender_role: ChannelSenderRole;
  /** The teacher's display name, the student's or the guardian's name; empty once the login is gone. */
  sender_name: string;
  /** Written by the caller. */
  mine: boolean;
  created_at: string;
}

/** A thread page: oldest first within the page. */
export interface ChannelPage {
  messages: ChannelMessageView[];
  has_more: boolean;
  /** A monitor's view: no composer, «للاطلاع فقط». */
  read_only: boolean;
}

/** GET /teachers/me/channels: one row per current student. */
export interface TeacherChannelRow {
  student_id: string;
  student_name: string;
  student_code: string;
  last_message: Pick<ChannelMessageView, 'body' | 'sender_role' | 'created_at'> | null;
  /** Messages from the family after my last read. */
  unread: number;
}

/** The family's or the teacher's unread total (badges). */
export interface ChannelUnread {
  unread: number;
}
