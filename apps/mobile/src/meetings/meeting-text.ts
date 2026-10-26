import { intlLocale, type MeetingView } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { webOrigin } from '@/classroom/links/web-origin';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

const errors: Record<string, string | undefined> = t.classroom.error;

/** The web room of an internal meeting (`/meeting/<id>`), where the WebRTC page lives. */
export const meetingUrl = (id: string): string => `${webOrigin()}/meeting/${id}`;

/** «5 أكتوبر 14:30» in the viewer's zone (default Riyadh), Western digits. */
export function meetingWhen(iso: string, timeZone = 'Asia/Riyadh'): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso));
}

const R = t.meetings.internal.refusal;

/** A refused join in a meeting's words (never a lesson's): not open yet names when it opens on the viewer's clock. */
function refusal(code: unknown, opensAt: unknown, tz: string): string | null {
  if (code === 'join_not_open_yet') return typeof opensAt === 'string' ? R.notOpenAt.replace('{when}', meetingWhen(opensAt, tz)) : R.notOpen;
  return code === 'join_closed' ? R.closed : null;
}

/**
 * The line for a refused meeting call: a join refusal (refusal()), a bare 403 «غير مسموح لك بدخول هذا
 * الاجتماع»; then the API's `code` in words (meeting_ended, meeting_not_found, forbidden), else the generic one.
 */
export function meetingError(error: unknown, tz = 'Asia/Riyadh'): string {
  const body = error instanceof ApiError ? error.body : null;
  const read = (key: string): unknown => (typeof body === 'object' && body !== null ? Reflect.get(body, key) : undefined);
  const code = read('code');
  const meeting = refusal(code, read('opens_at'), tz);
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
