import { intlLocale } from '@ab/shared';
import { ApiError } from '@/lib/api';
import { webOrigin } from '@/classroom/web-origin';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

const errors: Record<string, string | undefined> = t.classroom.error;

/** The web room of an internal meeting (`/meeting/<id>`), where the WebRTC page lives. */
export const meetingUrl = (id: string): string => `${webOrigin()}/meeting/${id}`;

/** «5 أكتوبر 14:30» in the Riyadh zone, Western digits (`timeZone` is a test seam). */
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

/** The line for a refused meeting call: the API's `code` in words (meeting_ended, meeting_not_found, forbidden), else the generic one. */
export function meetingError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const code = typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;
  if (typeof code === 'string' && errors[code]) return errors[code];
  if (error instanceof ApiError && error.status === 403) return t.classroom.error.forbidden;
  return t.meetings.internal.actionError;
}
