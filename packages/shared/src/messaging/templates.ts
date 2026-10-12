import { meetingLinkParts } from './meeting-link.js';
import type { QuickReplyIntent } from './quick-reply.js';

// The template registry's keys and the messages.template_params shape (docs/12 §2, migration 141).

/** message_templates.key, as producers write it to messages.template_key. */
export const TEMPLATE_KEYS = [
  'booking_confirmation',
  'booking_confirmation_meet',
  'booking_confirmation_plain',
  'lesson_reminder',
  'lesson_reminder_meet',
  'lesson_reminder_plain',
  'teacher_lesson_reminder',
  'teacher_lesson_reminder_meet',
  'lesson_reminder_24h',
  'report_ready',
  'renewal_due',
  'follow_up_slots',
  'lesson_feedback_request',
  'lesson_join_link',
  'lesson_rating',
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/** Body variable positions {{1}}…{{9}}: the keys of messages.template_params a send may fill. */
export const BODY_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export type BodySlot = (typeof BODY_SLOTS)[number];

/** The PDF a document-header template carries; the sender signs it (7 days) when it sends. */
export interface TemplateDocument {
  bucket: string;
  path: string;
  filename: string;
}

/** messages.template_params: body variables by position, plus the button and header parts. */
export interface TemplateParams extends Partial<Record<BodySlot, string>> {
  /** URL-button suffix: the Meet code, the Jitsi room slug, the signed feedback token or the classroom guest token. */
  button?: string;
  /** Quick-reply payloads by button index, each quickReplyPayload(intent, ref). */
  payloads?: string[];
  document?: TemplateDocument;
}

/** message_templates.buttons entries. `text` of an approved URL button comes from Meta's sync. */
export type TemplateButton =
  | { type: 'url'; url: string; text?: string }
  | { type: 'quick_reply'; text: string; intent: QuickReplyIntent };

/** What a producer queues: the registry key and its params. */
export interface OutboundTemplate {
  key: TemplateKey;
  params: TemplateParams;
}

type LinkVariant<K extends TemplateKey> = { key: K; button: string | null };

/** Same-day guardian reminder (lesson_reminder_v2 on Meta): Jitsi → base, Meet → _meet, else _plain. */
export function lessonReminderTemplate(
  link: string | null | undefined,
): LinkVariant<'lesson_reminder' | 'lesson_reminder_meet' | 'lesson_reminder_plain'> {
  const { host, slug } = meetingLinkParts(link);
  if (host === 'jitsi') return { key: 'lesson_reminder', button: slug };
  if (host === 'meet') return { key: 'lesson_reminder_meet', button: slug };
  return { key: 'lesson_reminder_plain', button: null };
}

/** Teacher reminder: only Meet has a button variant; Jitsi and no link use the plain one. */
export function teacherReminderTemplate(
  link: string | null | undefined,
): LinkVariant<'teacher_lesson_reminder' | 'teacher_lesson_reminder_meet'> {
  const { host, slug } = meetingLinkParts(link);
  return host === 'meet'
    ? { key: 'teacher_lesson_reminder_meet', button: slug }
    : { key: 'teacher_lesson_reminder', button: null };
}

/**
 * Keys about one upcoming lesson (docs/12 §3): never sent once the lesson is cancelled or moved,
 * and, when queued without expires_at, not after it started. lesson_join_link always carries its
 * own expires_at (the room's close). Not here on purpose: report_ready, renewal_due and
 * lesson_feedback_request (sent after the lesson; its link carries its own messages.expires_at).
 */
const LESSON_TIMED: ReadonlySet<string> = new Set<TemplateKey>([
  'booking_confirmation',
  'booking_confirmation_meet',
  'booking_confirmation_plain',
  'lesson_reminder',
  'lesson_reminder_meet',
  'lesson_reminder_plain',
  'teacher_lesson_reminder',
  'teacher_lesson_reminder_meet',
  'lesson_reminder_24h',
  'lesson_join_link',
]);

/** A template about an upcoming lesson: a booking confirmation or a reminder. */
export function isLessonTimed(key: string | null): boolean {
  return key !== null && LESSON_TIMED.has(key);
}

export interface ExpiryInput {
  templateKey: string | null;
  /** messages.expires_at (set by Phase 4 producers). */
  expiresAt: string | null;
  /** starts_at of messages.lesson_id, when there is one. */
  lessonStartsAt: string | null;
  now: Date;
}

/**
 * A queued row past its use is never sent (failed, error_code 'expired'): past expires_at, or —
 * for rows queued without one (the booking RPCs) — a lesson-timed template whose lesson started.
 * report_ready and renewal_due never expire this way.
 */
export function messageExpired(input: ExpiryInput): boolean {
  const now = input.now.getTime();
  if (input.expiresAt) return Date.parse(input.expiresAt) <= now;
  if (!input.lessonStartsAt || !input.templateKey || !LESSON_TIMED.has(input.templateKey)) return false;
  return Date.parse(input.lessonStartsAt) <= now;
}
