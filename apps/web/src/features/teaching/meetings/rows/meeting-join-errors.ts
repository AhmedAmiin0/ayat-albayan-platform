import { classroomErrorText, opensAtOf } from '@/features/teaching/classroom/room/livekit/errors';
import { viewerTz } from '@/features/teaching/classroom/student-link/student-link';
import { errorCode } from '@/features/teaching/schedule/api';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { whenText } from '../scheduled/meeting-when';
import type { Clock } from '@/lib/clock';

const R = t.meetings.internal.refusal;

/**
 * A refused meeting join (/meeting/:id, /m/:token) in a meeting's words, never a lesson's: not open
 * yet names the day and time the room opens (opens_at, from the settings' window) on the viewer's
 * clock; closed and forbidden (also a bare 403: the guard or the join role check) have their own
 * lines; anything else the classroom's line.
 */
export function meetingJoinProblem(error: unknown, clock: Clock, tz: string = viewerTz()): string {
  const code = errorCode(error);
  if (code === 'join_not_open_yet') {
    const opens = opensAtOf(error);
    return opens ? R.notOpenAt.replace('{when}', whenText(opens, tz, clock)) : R.notOpen;
  }
  if (code === 'join_closed') return R.closed;
  if (code === 'forbidden' || (code === null && error instanceof ApiError && error.status === 403)) return R.forbidden;
  return classroomErrorText(error);
}
