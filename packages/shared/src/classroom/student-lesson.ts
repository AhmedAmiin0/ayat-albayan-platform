import { DEFAULT_JOIN_WINDOW, joinWindow, type JoinWindowConfig, type WindowLesson } from './join-window.js';

/**
 * Which lesson a student's long-lived link opens at `now`, among their open lessons (scheduled /
 * confirmed; the caller filters statuses):
 *   1. a lesson whose room is open and that has not ended yet (in progress, or about to start);
 *      the earliest such, so the student stays in the lesson they are in;
 *   2. else the room still open after its end (the closesAfterMin tail), the latest such;
 *   3. else the next lesson whose room has not opened yet (earliest start).
 * null when none of them is left. Closed rooms are never picked.
 */
export function pickStudentLesson<T extends WindowLesson>(lessons: readonly T[], now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): T | null {
  const t = now.getTime();
  const byStart = [...lessons].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const open = byStart.filter((l) => joinWindow(l, now, win).state === 'open');
  const running = open.find((l) => Date.parse(l.ends_at) > t);
  if (running) return running;
  const tail = open.at(-1);
  if (tail) return tail;
  return byStart.find((l) => joinWindow(l, now, win).state === 'early') ?? null;
}
