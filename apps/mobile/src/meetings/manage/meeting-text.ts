import { dateText, type ClockCycle, type MeetingView } from '@ab/shared';
import { clockIn, dateWithClock } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

const errors: Record<string, string | undefined> = t.classroom.error;

/** «5 أكتوبر، 14:30» / «5 أكتوبر، 2:30 م» in the viewer's zone, Western digits. */
export function meetingWhen(iso: string, timeZone: string, cycle: ClockCycle): string {
  const at = new Date(iso);
  const day = dateText(at, { tz: timeZone, locale }, { day: 'numeric', month: 'short' });
  return dateWithClock(day, clockIn(at, timeZone, cycle));
}

const R = t.meetings.internal.refusal;

/** A refused join in a meeting's words (never a lesson's): not open yet names when it opens on the viewer's clock. */
function refusal(code: unknown, opensAt: unknown, clock: { tz: string; cycle: ClockCycle }) {
  if (code !== 'join_not_open_yet') return code === 'join_closed' ? R.closed : null;
  if (typeof opensAt !== 'string') return R.notOpen;
  return R.notOpenAt.replace('{when}', meetingWhen(opensAt, clock.tz, clock.cycle));
}

/**
 * The line for a refused meeting call: a join refusal (refusal()), a bare 403 «غير مسموح لك بدخول هذا
 * الاجتماع»; then the API's `code` in words (meeting_ended, meeting_not_found, forbidden), else the generic one.
 */
export function meetingError(error: unknown, cycle: ClockCycle, tz: string): string {
  const body = error instanceof ApiError ? error.body : null;
  const read = (key: string): unknown => (typeof body === 'object' && body !== null ? Reflect.get(body, key) : undefined);
  const code = read('code');
  const meeting = refusal(code, read('opens_at'), { tz, cycle });
  if (meeting) return meeting;
  if (code === undefined && error instanceof ApiError && error.status === 403) return R.forbidden;
  if (typeof code === 'string' && errors[code]) return errors[code];
  if (error instanceof ApiError && error.status === 403) return t.classroom.error.forbidden;
  return t.meetings.internal.actionError;
}

/** The stack a meeting's recordings open in: the teacher's or salesperson's «المزيد», the assistant's home, else the admin's «البث المباشر». */
export function meetingsBase(segment: string | undefined): string {
  if (segment === 'teacher') return '/teacher/more';
  if (segment === 'sales') return '/sales/more';
  if (segment === 'assistant') return '/assistant/lessons';
  return '/more/live';
}

/** Its creator (or an admin) may act on an open, not cancelled meeting; a scheduled one may also move. */
export function manageOf(m: Pick<MeetingView, 'state' | 'can_manage' | 'cancelled_at' | 'starts_at'>): { manage: boolean; startsAt: string | null } {
  const manage = m.state === 'open' && m.can_manage && !m.cancelled_at;
  return { manage, startsAt: manage ? m.starts_at : null };
}
