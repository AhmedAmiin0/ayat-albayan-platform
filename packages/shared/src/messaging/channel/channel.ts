import { z } from 'zod';
import { channelAttachmentInputSchema } from './channel-media';

// The student channel (docs/31 §2): an in-platform text chat between a student's family, the
// student's current teacher(s) and the owning assistant, who may write too,
// read-only for monitors (student_channels.monitor). Never on WhatsApp. Views are whitelists: names
// only, never a phone, email or profile id.

/** channel_messages.body check (migration 800), after trimming. */
export const CHANNEL_BODY_MAX = 2000;

/** One page of a thread (`?before=` pages back). */
export const CHANNEL_PAGE_SIZE = 50;

const text = z.string().trim().max(CHANNEL_BODY_MAX);

/**
 * POST …/messages: text, a file (with an optional caption) or both, maybe a reply. `client_id`
 * (a uuid per send, sent by every new app) makes a resend return the stored message.
 */
export const channelPostSchema = z
  .object({
    body: text.default(''),
    client_id: z.uuid().optional(),
    reply_to_id: z.uuid().optional(),
    attachment: channelAttachmentInputSchema.optional(),
  })
  .refine((p) => p.body !== '' || p.attachment !== undefined, {
    message: 'empty_message',
    path: ['body'],
  });
export type ChannelPost = z.output<typeof channelPostSchema>;

/** PATCH …/messages/:id: a text message's new text (a file is never edited). */
export const channelEditSchema = z.object({ body: text.min(1) });
export type ChannelEdit = z.output<typeof channelEditSchema>;

/** GET …/messages?before=<iso>. */
export const channelPageQuerySchema = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
});

/** channel_messages.sender_role (migrations 800, 20261116000200): 'sales' = the assistant. */
export const CHANNEL_SENDER_ROLES = ['teacher', 'guardian', 'student', 'sales'] as const;
export type ChannelSenderRole = (typeof CHANNEL_SENDER_ROLES)[number];

/** POST …/read: read up to the newest message shown (never later than now); now when absent. */
export const channelReadSchema = z.object({
  at: z.iso.datetime({ offset: true }).optional(),
});

/** POST …/messages or …/read on a closed channel (409). */
export const CHANNEL_NOT_OPEN = 'channel_not_open';

/** PUT …/channel/seat while another assistant holds it and I did not bring the student (409). */
export const CHANNEL_SEAT_TAKEN = 'channel_seat_taken';

/** students.status before the subscription: the channel stays closed (never during the trial). */
const BEFORE_SUBSCRIPTION: readonly string[] = ['new', 'trial', 'pending_subscription'];

interface StudentGate {
  status: string;
  teacher_id: string | null;
}

/** Migration 971 channel_is_open: subscribed (past the trial) and students.teacher_id assigned. */
export const channelOpen = (s: StudentGate): boolean =>
  s.teacher_id !== null && !BEFORE_SUBSCRIPTION.includes(s.status);

/** Why a participant's channel is closed (null while open); the apps pick the closed line. */
export const CHANNEL_CLOSED_REASONS = ['not_subscribed', 'no_teacher', 'family_chat_off'] as const;
export type ChannelClosedReason = (typeof CHANNEL_CLOSED_REASONS)[number];

/**
 * The closed line's reason: before the subscription first, then no teacher. A family viewer
 * while settings.family_chat_enabled is off: family_chat_off before anything else.
 */
export function channelClosedReason(
  s: StudentGate,
  viewer: { family: boolean; familyChatOn: boolean },
): ChannelClosedReason | null {
  if (viewer.family && !viewer.familyChatOn) return 'family_chat_off';
  const reasons: [boolean, ChannelClosedReason][] = [
    [BEFORE_SUBSCRIPTION.includes(s.status), 'not_subscribed'],
    [s.teacher_id === null, 'no_teacher'],
  ];
  return reasons.find(([applies]) => applies)?.[1] ?? null;
}

/** The family's or the teacher's unread total (badges): GET …/channel/unread, parsed. */
export const channelUnreadSchema = z.object({ unread: z.number().int().nonnegative() });
