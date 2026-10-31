import { sendErrorReason } from '@ab/client-core';
import {
  type ClockCycle,
  dayParts,
  isUnavailableMessage,
  isUnsupportedMessage,
  type MessageView,
  noteText,
  type NoteWords,
  previewNote,
  reactionText,
  type ThreadView,
} from '@ab/shared';
import { clockIn, phoneTz } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

// The words a thread shows (R-MOB-02): media labels, template names, times, send errors.
// All Arabic comes from ar.json; times are the device's zone, Western digits.

type MediaKind = keyof typeof t.inbox.media;

/** A deleted message, the ad's welcome, an unsupported echo (owner 2026-10-30, marker-notes). */
const NOTES: NoteWords = {
  deleted: t.inbox.deletedMessage,
  adWelcome: t.inbox.adWelcome,
  unsupported: t.inbox.unsupportedEcho,
};

/** inbox.media.<kind> for a WhatsApp mime type. WhatsApp stickers are webp images. */
export function mediaKind(mime: string | null): MediaKind {
  if (!mime) return 'other';
  if (mime === 'image/webp') return 'sticker';
  const top = mime.split('/')[0];
  if (top === 'image' || top === 'audio' || top === 'video') return top;
  if (top === 'application' || top === 'text') return 'document';
  return 'other';
}

type LineOf = Pick<MessageView, 'body' | 'media_mime' | 'interactive_payload'> &
  Partial<Pick<MessageView, 'direction' | 'deleted'>>;

/**
 * The attachment line: its kind when there is a file; when there is neither file nor text (Meta's
 * `unsupported`, a location, a contact card…) as the web's: Meta's `unsupported` asks the
 * sender to send it again («هذه الرسالة غير متاحة» for 131060), anything else (a location, a contact
 * card…) arrived but cannot be shown here; null for a plain text message. A note comes first: a
 * deleted message, the ad's welcome or an unsupported echo (owner 2026-10-30).
 */
export function mediaLine(m: LineOf): string | null {
  const note = noteText({ ...m, direction: m.direction ?? 'inbound' }, NOTES);
  if (note) return note;
  if (m.media_mime) return t.inbox.media[mediaKind(m.media_mime)];
  if (m.body) return null;
  const reacted = reactionText(m.interactive_payload, { reacted: t.inbox.reacted, removed: t.inbox.reactionRemoved });
  if (reacted) return reacted;
  if (isUnavailableMessage(m.interactive_payload)) return t.inbox.unavailable;
  return isUnsupportedMessage(m.interactive_payload) ? t.inbox.unsupported : t.inbox.media.other;
}

/** «قالب: تذكير الحلقة النهاردة — Jitsi»; an unknown key shows as itself, never blank. */
export function templateLine(key: string): string {
  const names: Record<string, string> = t.templates.names;
  return t.inbox.templateLine.replace('{name}', names[key] ?? key);
}

/**
 * A thread row's last message: «إنت: …» for ours, media and templates named; Meta's `unsupported`
 * (131060 on a new number's first message) is «رسالة لم يصل محتواها», not the generic line.
 */
export function threadPreview(th: ThreadView): string {
  const note = previewNote(th, NOTES);
  if (note) return th.last_direction === 'outbound' ? `${t.inbox.you} ${note}` : note;
  const media = th.last_media_mime ? t.inbox.media[mediaKind(th.last_media_mime)] : null;
  const other = th.last_unsupported ? t.inbox.previewUnsupported : t.inbox.media.other;
  const text = media
    ? [media, th.last_body].filter(Boolean).join(': ')
    : (th.last_body ?? (th.last_template_key ? templateLine(th.last_template_key) : other));
  return th.last_direction === 'outbound' ? `${t.inbox.you} ${text}` : text;
}

/** The thread's zone: the phone's (phoneTz). */
export function deviceTimeZone(): string {
  return phoneTz();
}

interface StampOptions {
  now?: Date;
  tz?: string;
  /** «تنسيق الوقت»: 12 or 24 h. */
  cycle: ClockCycle;
}

/** «08:05» today, «30/9 08:05» another day (or «8:05 ص»), in the device's zone (or `tz`). */
export function stamp(iso: string, { now = new Date(), tz = deviceTimeZone(), cycle }: StampOptions): string {
  const at = new Date(iso);
  const time = clockIn(at, tz, cycle);
  const { day, month, year } = dayParts(at, tz);
  const today = dayParts(now, tz);
  if (day === today.day && month === today.month && year === today.year) return time;
  return `${day}/${month} ${time}`;
}

/** «16:39» / «4:39 م» in the device's zone (or `tz`): a bubble's time, its day is in the separator above it. */
export function clock(iso: string, cycle: ClockCycle, tz = deviceTimeZone()): string {
  return clockIn(new Date(iso), tz, cycle);
}

/** «هتتبعت …» for a row scheduled later (a booking confirmation, a reminder), else null. */
export function queuedLine(m: Pick<MessageView, 'status' | 'scheduled_for'>, options: StampOptions) {
  const now = options.now ?? new Date();
  if (m.status !== 'queued' || !m.scheduled_for || Date.parse(m.scheduled_for) <= now.getTime()) {
    return null;
  }
  return t.messages.queuedFor.replace('{time}', stamp(m.scheduled_for, options));
}

/** «أُرسلت … · وصلت … · قُرئت …»: every delivery time Meta reported on ours (the web's deliveryTitle). */
export function deliveryTimes(m: MessageView, options: StampOptions): string {
  if (m.direction !== 'outbound') return '';
  const steps: [string, string | null][] = [
    [t.messages.sentAt, m.sent_at],
    [t.messages.deliveredAt, m.delivered_at],
    [t.messages.readAt, m.read_at],
  ];
  return steps.flatMap(([text, iso]) => (iso ? [text.replace('{time}', stamp(iso, options))] : [])).join(' · ');
}

/** «السبب: …» from Meta's code (messages.errors), or the unknown line carrying the code (as the web). */
export function errorLine(m: Pick<MessageView, 'error_code'>): string {
  return t.messages.errorLine.replace('{reason}', sendErrorReason(m.error_code, t.messages.errors));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** A refused send in Arabic: inbox.error.<code> (session_closed…), else «الرسالة متبعتتش…». */
export function sendError(error: unknown): string {
  const code = error instanceof ApiError && isRecord(error.body) ? error.body['code'] : undefined;
  const errors: Record<string, string> = t.inbox.error;
  return (typeof code === 'string' ? errors[code] : undefined) ?? t.inbox.error.send_failed;
}
