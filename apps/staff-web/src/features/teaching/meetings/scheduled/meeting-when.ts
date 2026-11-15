import { lessonWhenAt, type MeetingView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';

const L = t.meetingInvites.list;

/** «الأحد 4 أكتوبر 17:00» on the viewer's clock (UTC from the API, rule 6). */
export const whenText = (iso: string, tz: string, clock: Clock): string => lessonWhenAt(new Date(iso), { tz, ...clock });

/** «الموعد: …» for a scheduled meeting, «اجتماع فوري» for an instant one. */
export function scheduleLine(m: Pick<MeetingView, 'starts_at'>, tz: string, clock: Clock): string {
  return m.starts_at ? L.scheduledFor.replace('{when}', whenText(m.starts_at, tz, clock)) : L.instant;
}

/** «يُفتح الدخول …» while a scheduled meeting's window has not opened yet; else null. */
export function opensLine(m: Pick<MeetingView, 'window' | 'cancelled_at'>, tz: string, clock: Clock): string | null {
  if (m.cancelled_at || m.window?.state !== 'early') return null;
  return L.opensAt.replace('{when}', whenText(m.window.opens_at, tz, clock));
}

/** The guest page's intro for a scheduled meeting not open yet: when it starts and when the room opens. */
export function guestScheduleText(v: { starts_at: string | null; opens_at: string | null }, ctx: { now: Date; tz: string }, clock: Clock): string | null {
  if (!v.starts_at || !v.opens_at || Date.parse(v.opens_at) <= ctx.now.getTime()) return null;
  return [L.scheduledFor.replace('{when}', whenText(v.starts_at, ctx.tz, clock)), L.opensAt.replace('{when}', whenText(v.opens_at, ctx.tz, clock))].join(' · ');
}
