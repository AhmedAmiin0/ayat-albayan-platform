import {
  canSkip,
  DEFAULT_JOIN_WINDOW,
  joinWindow,
  type JoinWindowConfig,
  type TestFlags,
  type WindowLesson,
} from '@ab/shared';
import { HttpException, HttpStatus } from '@nestjs/common';

/** 403 join_not_open_yet (with opens_at) before the window (room_opened_at counts), 410 join_closed after it. */
export function assertWindowOpen(lesson: WindowLesson, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): void {
  const w = joinWindow(lesson, now, win);
  if (w.state === 'early') {
    throw new HttpException({ code: 'join_not_open_yet', message: 'join_not_open_yet', opens_at: w.opens_at }, HttpStatus.FORBIDDEN);
  }
  if (w.state === 'closed') {
    throw new HttpException({ code: 'join_closed', message: 'join_closed' }, HttpStatus.GONE);
  }
}

type WindowCheck = typeof assertWindowOpen;
const windowSkipped: WindowCheck = () => undefined;

/**
 * The window check for these flags (docs/56): none only when a test login joins a lesson of test
 * students (canSkip('join_window'), the double condition); anyone else gets assertWindowOpen.
 */
export const windowCheckFor = (flags: TestFlags): WindowCheck =>
  canSkip('join_window', flags) ? windowSkipped : assertWindowOpen;

/** 503 classroom_not_configured: LIVEKIT_* are not set on this server. */
export const notConfigured = (): HttpException =>
  new HttpException({ code: 'classroom_not_configured', message: 'classroom_not_configured' }, HttpStatus.SERVICE_UNAVAILABLE);
