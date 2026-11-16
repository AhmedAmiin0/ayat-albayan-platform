import { z } from 'zod';

// The student channel (docs/31 §2): an in-platform text chat between a student's family, the
// student's current teacher(s) and the owning assistant (owner 2026-11-16 «yes it can write also»),
// read-only for monitors (student_channels.monitor). Never on WhatsApp. Views are whitelists: names
// only, never a phone, email or profile id.

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

/** channel_messages.sender_role (migrations 800, 20261116000200): 'sales' = the assistant. */
export const CHANNEL_SENDER_ROLES = ['teacher', 'guardian', 'student', 'sales'] as const;
export type ChannelSenderRole = (typeof CHANNEL_SENDER_ROLES)[number];

export interface ChannelMessageView {
  id: string;
  body: string;
  sender_role: ChannelSenderRole;
  /**
   * The teacher's display name, the student's, the guardian's or the assistant's name; empty once
   * the login is gone.
   */
  sender_name: string;
  /** Written by the caller. */
  mine: boolean;
  created_at: string;
  /**
   * Changed by its sender after sending: «تم التعديل» (the earlier text is kept for audit, never
   * shown).
   */
  edited: boolean;
  /** Deleted for everyone: «تم حذف هذه الرسالة», body empty. */
  deleted: boolean;
}

/** POST …/read: read up to the newest message shown (never later than now); now when absent. */
export const channelReadSchema = z.object({
  at: z.iso.datetime({ offset: true }).optional(),
});

/** A thread page: oldest first within the page. */
export interface ChannelPage {
  /** Whose channel it is (the header names the student). */
  student_name: string;
  messages: ChannelMessageView[];
  has_more: boolean;
  /** A monitor's view: no composer, «للاطلاع فقط». */
  read_only: boolean;
  /**
   * Subscribed AND a teacher assigned (channelOpen, owner 2026-10-29). Closed: a participant gets
   * no
   * messages and no composer, only «تُفتح المحادثة مع المعلم بعد الاشتراك»; a monitor still reads.
   */
  open: boolean;
  /**
   * The Realtime filter (channel_messages.channel_id); RLS decides what the socket tells each
   * viewer.
   */
  channel_id: string;
}

/** POST …/messages or …/read on a closed channel (409). */
export const CHANNEL_NOT_OPEN = 'channel_not_open';

/** students.status before the subscription: the channel stays closed (never during the trial). */
const BEFORE_SUBSCRIPTION: readonly string[] = ['new', 'trial', 'pending_subscription'];

/** Migration 971 channel_is_open: subscribed (past the trial) and students.teacher_id assigned. */
export const channelOpen = (s: { status: string; teacher_id: string | null }): boolean =>
  s.teacher_id !== null && !BEFORE_SUBSCRIPTION.includes(s.status);

/** GET /teachers/me/channels: one row per current student. */
export interface TeacherChannelRow {
  student_id: string;
  student_name: string;
  student_code: string;
  last_message: Pick<ChannelMessageView, 'body' | 'sender_role' | 'created_at' | 'deleted'> | null;
  /** Messages from the family (guardian, student) and the assistant after my last read. */
  unread: number;
}

/** The family's or the teacher's unread total (badges): GET …/channel/unread, parsed by the clients. */
export const channelUnreadSchema = z.object({ unread: z.number().int().nonnegative() });
export type ChannelUnread = z.infer<typeof channelUnreadSchema>;
