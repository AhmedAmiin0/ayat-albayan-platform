import type { PortalLesson } from '@ab/shared';
import { isAhead, isLessonNow, windowStateAt } from './lesson-window';

// docs/50 §6: the app re-renders every second and words the parts itself.

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SECOND = 1000;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

/** What is left until `target` in whole units, or null once it is reached. */
export function countdownParts(target: string, now: Date): CountdownParts | null {
  const left = Math.floor((Date.parse(target) - now.getTime()) / SECOND);
  if (!(left > 0)) return null;
  return {
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
    seconds: left % MINUTE,
  };
}

/** «hh:mm:ss» of the parts under a day (Western digits, docs/07 §2). */
export const clockParts = (p: CountdownParts): string =>
  [p.hours, p.minutes, p.seconds].map((n) => String(n).padStart(2, '0')).join(':');

/**
 * The card's clock: `now` while it runs, `opensIn` until the window opens, `startsIn` from the
 * window to the start; null for a cancelled or finished lesson.
 */
export type LessonClock =
  | { kind: 'now' }
  | { kind: 'opensIn' | 'startsIn'; parts: CountdownParts };

type ClockKind = 'opensIn' | 'startsIn';

const TARGET: Record<ClockKind, (l: PortalLesson) => string> = {
  opensIn: (l) => l.window.opens_at,
  startsIn: (l) => l.starts_at,
};

export function lessonClock(lesson: PortalLesson, now: Date): LessonClock | null {
  if (!isAhead(lesson, now)) return null;
  if (isLessonNow(lesson, now)) return { kind: 'now' };
  const kind: ClockKind = windowStateAt(lesson.window, now) === 'early' ? 'opensIn' : 'startsIn';
  const parts = countdownParts(TARGET[kind](lesson), now);
  return parts ? { kind, parts } : null;
}
