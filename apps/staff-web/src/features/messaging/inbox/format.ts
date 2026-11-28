import { sendErrorReason } from '@ab/client-core';
import {
  previewNote,
  SESSION_WINDOW_MS,
  stripWaMarkup,
  type MessageView,
  type NoteWords,
  type ThreadView,
} from '@ab/shared';
import { counted, formatPhone } from '@ab/core';
import { clockOf, dateText, localDateIn } from '@ab/time';
import type { Clock } from '@ab/web-kit';
import { dateAndClock, viewerZone, t, locale } from '@ab/web-kit';
import { showsPhone, type InboxMode } from './shared/mode';

// Display text for the inbox (docs/07 §9, docs/12 §8). DB instants are UTC; times render in the
// viewer's zone, 12 or 24 h as the viewer chose (useClock), Western digits (`nu-latn`).

const dayMonth = (at: Date): string =>
  dateText(at, { tz: viewerZone(), locale }, { day: 'numeric', month: 'short' });
const sameDay = (a: Date, b: Date): boolean =>
  localDateIn(a, viewerZone()) === localDateIn(b, viewerZone());
const clockAt = (at: Date, clock: Clock): string => clockOf(at, { ...clock, tz: viewerZone() });

export type MediaKind = keyof typeof t.inbox.media;

/** A deleted message, the ad's welcome, an unsupported echo (marker-notes). */
export const NOTE_WORDS: NoteWords = {
  deleted: t.inbox.deletedMessage,
  adWelcome: t.inbox.adWelcome,
  unsupported: t.inbox.unsupportedEcho,
};

/** WhatsApp media by MIME: image / audio / video, a WebP sticker; PDFs and the rest documents. */
export function mediaKind(mime: string | null): MediaKind {
  if (!mime) return 'other';
  if (mime === 'image/webp') return 'sticker';
  const top = mime.split('/')[0];
  if (top === 'image' || top === 'audio' || top === 'video') return top;
  return 'document';
}

/** The name a person reads: guardian ?? lead ?? teacher, else the grouped phone. */
export function threadName(th: Pick<ThreadView, 'display_name' | 'phone_e164'>): string {
  return th.display_name ?? formatPhone(th.phone_e164);
}

/**
 * What the thread is called in this mode: a teacher never sees the number, so an unnamed one
 * says who it is.
 */
export function threadTitle(th: ThreadView, mode: InboxMode): string {
  if (showsPhone(mode)) return threadName(th);
  const kind = threadKind(th);
  return th.display_name ?? (kind ? t.inbox.kind[kind] : t.inbox.unknownNumber);
}

/** Who the number is: a guardian or teacher on file, else a lead, else nobody known yet. */
export function threadKind(th: ThreadView): keyof typeof t.inbox.kind | null {
  if (th.guardian_id) return 'guardian';
  if (th.teacher_id) return 'teacher';
  return th.lead_id ? 'lead' : null;
}

const templateName = (key: string): string =>
  (t.templates.names as Record<string, string>)[key] ?? key;

export function templateLine(key: string): string {
  return t.inbox.templateLine.replace('{name}', templateName(key));
}

function lastText(th: ThreadView): string {
  const note = previewNote(th, NOTE_WORDS);
  if (note) return note;
  const media = th.last_media_mime ? t.inbox.media[mediaKind(th.last_media_mime)] : null;
  if (media) return th.last_body ? `${media}: ${th.last_body}` : media;
  if (th.last_body) return th.last_body;
  if (th.last_template_key) return templateLine(th.last_template_key);
  // Meta's `unsupported` (131060 on a new number's first message): its content never arrived.
  if (th.last_unsupported) return t.inbox.previewUnsupported;
  return t.inbox.media.other; // an inbound type we can't show (location, contacts, …)
}

/** WhatsApp markers are dropped from the preview, as WhatsApp's own list does. */
export function previewText(th: ThreadView): string {
  const text = stripWaMarkup(lastText(th));
  return th.last_direction === 'outbound' ? `${t.inbox.you} ${text}` : text;
}

export const unreadLabel = (n: number): string => counted(t.inbox.unread, n);

/** `now` comes from the list's ticking clock; a default would be frozen by the React Compiler. */
export function listTime(iso: string, clock: Clock, now: Date): string {
  const at = new Date(iso);
  return sameDay(at, now) ? clockAt(at, clock) : dayMonth(at);
}

export const clockText = (iso: string, clock: Clock): string => clockAt(new Date(iso), clock);

/** Another day includes the date because the 24 h window needs it. */
export function stampText(iso: string, clock: Clock, now: Date): string {
  const at = new Date(iso);
  return sameDay(at, now) ? clockAt(at, clock) : `${dayMonth(at)} ${clockAt(at, clock)}`;
}

const CITIES: Record<string, string | undefined> = t.tz;

export function timesInText(tz: string = viewerZone()): string {
  return t.inbox.timesIn.replace('{city}', CITIES[tz] ?? tz);
}
export const fullTime = (iso: string, clock: Clock): string =>
  dateAndClock(new Date(iso), { ...clock, tz: viewerZone() }, { dateStyle: 'medium' });

/** Plain replies are allowed until 24 h after their last message. */
export function sessionUntil(lastInboundAt: string, clock: Clock): string {
  return t.inbox.sessionOpenUntil.replace(
    '{time}',
    fullTime(new Date(Date.parse(lastInboundAt) + SESSION_WINDOW_MS).toISOString(), clock),
  );
}

export function errorText(m: Pick<MessageView, 'error_code' | 'error_text'>): string {
  return sendErrorReason(m.error_code ?? m.error_text, t.messages.errors);
}
