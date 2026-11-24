import { canSkip, type TestFlags } from '@ab/shared';
import {
  DEFAULT_JOIN_WINDOW,
  isClosedLesson,
  joinWindow,
  roomEnded,
  type JoinWindowConfig,
  type WindowLesson,
} from '@ab/schedule';
import { HttpException, HttpStatus } from '@nestjs/common';

/** What the gates read of a lesson: its window and the room_ended_at stamp. */
type GateLesson = WindowLesson & { room_ended_at?: string | null };

const gone = (code: string): HttpException =>
  new HttpException({ code, message: code }, HttpStatus.GONE);

/** 410 lesson_ended: the teacher or an admin ended it for everyone (lessons.room_ended_at). */
export function assertNotEnded(lesson: GateLesson): void {
  if (roomEnded(lesson)) throw gone('lesson_ended');
}

/** 410 join_closed: the lesson was cancelled or moved to another row: it has no room any more. */
export function assertLessonHeld(lesson: { status: string }): void {
  if (isClosedLesson(lesson.status)) throw gone('join_closed');
}

/**
 * 410 lesson_ended once ended for everyone; 403 join_not_open_yet (with opens_at) before the window
 * (room_opened_at counts), 410 join_closed after it.
 */
export function assertWindowOpen(
  lesson: GateLesson,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): void {
  assertNotEnded(lesson);
  const w = joinWindow(lesson, now, win);
  if (w.state === 'early') {
    throw new HttpException({ code: 'join_not_open_yet', message: 'join_not_open_yet', opens_at: w.opens_at }, HttpStatus.FORBIDDEN);
  }
  if (w.state === 'closed') throw gone('join_closed');
}

type WindowCheck = typeof assertWindowOpen;
/** Skips the window only: a lesson ended for everyone stays closed to a test login too. */
const windowSkipped: WindowCheck = (lesson) => assertNotEnded(lesson);

/**
 * The window check for these flags (docs/56): no window only when a test login joins a lesson of
 * test students (canSkip('join_window'), the double condition); anyone else gets assertWindowOpen.
 */
export const windowCheckFor = (flags: TestFlags): WindowCheck =>
  canSkip('join_window', flags) ? windowSkipped : assertWindowOpen;

/** 503 classroom_not_configured: LIVEKIT_* are not set on this server. */
export const notConfigured = (): HttpException =>
  new HttpException({ code: 'classroom_not_configured', message: 'classroom_not_configured' }, HttpStatus.SERVICE_UNAVAILABLE);
