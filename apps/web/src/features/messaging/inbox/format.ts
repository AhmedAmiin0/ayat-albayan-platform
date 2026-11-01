import { sendErrorReason } from '@ab/client-core';
import {
  clockOf,
  counted,
  dateText,
  formatPhone,
  localDateIn,
  previewNote,
  SESSION_WINDOW_MS,
  type MessageView,
  type NoteWords,
  type ThreadView,
} from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { dateAndClock, viewerZone } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { showsPhone, type InboxMode } from './shared/mode';
import { locale } from '@/lib/i18n/locale';

// Display text for the inbox (docs/07 §9, docs/12 §8). DB instants are UTC; times render in the
// viewer's zone, 12 or 24 h as the viewer chose (useClock), Western digits (`nu-latn`).

const dayMonth = (at: Date): string =>
  dateText(at, { tz: viewerZone(), locale }, { day: 'numeric', month: 'short' });
const sameDay = (a: Date, b: Date): boolean =>
  localDateIn(a, viewerZone()) === localDateIn(b, viewerZone());
const clockAt = (at: Date, clock: Clock): string => clockOf(at, { ...clock, tz: viewerZone() });

export type MediaKind = keyof typeof t.inbox.media;

/** A deleted message, the ad's welcome, an unsupported echo (owner 2026-10-30, marker-notes). */
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

/** What the thread is called in this mode: a teacher never sees the number, so an unnamed one says who it is. */
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

const templateName = (key: string): string => (t.templates.names as Record<string, string>)[key] ?? key;

/** The template line over an outbound template bubble: «قالب: تأكيد الحجز — لينك Jitsi». */
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

/** One line under the name: the last message, «إنت:» before ours, media and templates named. */
export function previewText(th: ThreadView): string {
  return th.last_direction === 'outbound' ? `${t.inbox.you} ${lastText(th)}` : lastText(th);
}

/** «رسالتين جداد», «3 رسايل جديدة». */
export const unreadLabel = (n: number): string => counted(t.inbox.unread, n);

/**
 * Today → «14:05» / «2:05 م», another day → «3 أكتوبر». `now` is the list's ticking clock (useNow,
 * one per list): a default `new Date()` would be read once and kept by the React Compiler.
 */
export function listTime(iso: string, clock: Clock, now: Date): string {
  const at = new Date(iso);
  return sameDay(at, now) ? clockAt(at, clock) : dayMonth(at);
}

export const clockText = (iso: string, clock: Clock): string => clockAt(new Date(iso), clock);

/** A bubble's time: «05:53» today, «1 أكتوبر 05:53» another day (the 24 h window needs the day). */
export function stampText(iso: string, clock: Clock, now: Date): string {
  const at = new Date(iso);
  return sameDay(at, now) ? clockAt(at, clock) : `${dayMonth(at)} ${clockAt(at, clock)}`;
}

const CITIES: Record<string, string | undefined> = t.tz;

/** «المواعيد بتوقيت الرياض»: the zone every time on the page is shown in (the viewer's). */
export function timesInText(tz: string = viewerZone()): string {
  return t.inbox.timesIn.replace('{city}', CITIES[tz] ?? tz);
}
/** «03/10/2026، 14:05»: the whole stamp (tooltips, notes). */
export const fullTime = (iso: string, clock: Clock): string =>
  dateAndClock(new Date(iso), { ...clock, tz: viewerZone() }, { dateStyle: 'medium' });

/** «تقدر ترد برسالة عادية لحد …»: 24 h after their last message. */
export function sessionUntil(lastInboundAt: string, clock: Clock): string {
  return t.inbox.sessionOpenUntil.replace('{time}', fullTime(new Date(Date.parse(lastInboundAt) + SESSION_WINDOW_MS).toISOString(), clock));
}

/** Meta / sender error in words: messages.errors.<code>, else «حدثت مشكلة في الإرسال (code)» (as the phone). */
export function errorText(m: Pick<MessageView, 'error_code' | 'error_text'>): string {
  return sendErrorReason(m.error_code ?? m.error_text, t.messages.errors);
}
