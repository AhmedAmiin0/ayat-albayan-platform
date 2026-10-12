import { intlLocale, lessonWhenText, type MeetingInviteResult, type MeetingView } from '@ab/shared';
import { cityOf } from '@/booking/slots';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

const L = t.meetingInvites;
const errors: Record<string, string | undefined> = L.errors;

/** «الأحد 4 أكتوبر 17:00» in the viewer's zone (Western digits). */
export const whenText = (iso: string, tz: string): string => lessonWhenText(new Date(iso), tz, locale);

/** «الموعد: …» for a scheduled meeting, «اجتماع فوري» for an instant one. */
export function scheduleLine(meeting: Pick<MeetingView, 'starts_at'>, tz: string): string {
  return meeting.starts_at ? L.list.scheduledFor.replace('{when}', whenText(meeting.starts_at, tz)) : L.list.instant;
}

/** «يُفتح الدخول …» while a scheduled meeting's room is not open yet; null otherwise. */
export function opensLine(meeting: Pick<MeetingView, 'window' | 'cancelled_at' | 'state'>, tz: string): string | null {
  if (meeting.cancelled_at || meeting.state !== 'open' || meeting.window?.state !== 'early') return null;
  return L.list.opensAt.replace('{when}', whenText(meeting.window.opens_at, tz));
}

/** «الأوقات بتوقيت الرياض». */
export const tzNote = (tz: string): string => L.tzNote.replace('{tz}', cityOf(tz));

/** «60 دقيقة». */
export const minutesText = (n: number): string => L.minutes.replace('{n}', String(n));

/** One recipient's outcome in words: in-app, sent on WhatsApp, window closed, failed… */
export function resultLabel(r: Pick<MeetingInviteResult, 'status' | 'channel'>): string {
  if (r.status === 'sent') return r.channel === 'in_app' ? L.results.inApp : L.results.sent;
  if (r.status === 'window_closed') return L.results.windowClosed;
  if (r.status === 'failed') return L.results.failed;
  if (r.status === 'cancelled') return L.results.cancelled;
  return L.results.pending;
}

/** A refused invite call: the API's `code` in words when there is one, else `fallback`. */
export function inviteError(error: unknown, fallback: string = L.error): string {
  const body = error instanceof ApiError ? error.body : null;
  const code: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return (typeof code === 'string' ? errors[code] : undefined) ?? fallback;
}

const chipFormat = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A date chip: «اليوم» for the first, else «الأحد 4 أكتوبر» (a calendar day, formatted at UTC noon). */
export function dayChipLabel(date: string, isToday: boolean): string {
  if (isToday) return L.mobile.today;
  return chipFormat.format(new Date(`${date}T12:00:00Z`)).replace(/[،,]\s*/, ' ');
}
