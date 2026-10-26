import { DEFAULT_JOIN_WINDOW, isOpenLesson, joinWindow, type JoinWindowConfig, type LessonView } from '@ab/shared';

/** The three groups of the admin board, in reading order (same split as the web AdminSessions). */
export const SESSION_GROUPS = ['now', 'upcoming', 'ended'] as const;
export type SessionGroup = (typeof SESSION_GROUPS)[number];

/** Which group a lesson is in at `now`: its room is open, still to open, or closed. */
export function groupOf(lesson: LessonView, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): SessionGroup {
  const state = joinWindow(lesson, now, win).state;
  return state === 'open' ? 'now' : state === 'early' ? 'upcoming' : 'ended';
}

/** The day's lessons that still take place, by group, each group earliest first. */
export function groupSessions(
  lessons: readonly LessonView[],
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): Record<SessionGroup, LessonView[]> {
  const out: Record<SessionGroup, LessonView[]> = { now: [], upcoming: [], ended: [] };
  const open = lessons.filter((l) => isOpenLesson(l.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const l of open) out[groupOf(l, now, win)].push(l);
  return out;
}
