import type { PortalLesson } from '@ab/shared';
import { isOpenLesson, type JoinState, type JoinWindow } from '@ab/schedule';

// The join window as the screen's own clock reads it (moved from the web's student link and portal
// card, docs/50 §7): the API sends the window's edges; the page decides between them every tick.

/** The page's own clock against the window the API sent (its edges already count «الآن»). */
export function windowStateAt(w: Pick<JoinWindow, 'opens_at' | 'closes_at'>, now: Date): JoinState {
  const t = now.getTime();
  if (t < Date.parse(w.opens_at)) return 'early';
  return t > Date.parse(w.closes_at) ? 'closed' : 'open';
}

/** «حلقتك الآن» once the lesson has started (until it ends), «حلقتك القادمة» before. */
export const isLessonNow = (l: { starts_at: string; ends_at: string }, now: Date): boolean =>
  Date.parse(l.starts_at) <= now.getTime() && now.getTime() < Date.parse(l.ends_at);

/**
 * Why a lesson card has no «ادخل الحلقة»: cancelled, over (or no longer open), no way in known,
 * not open yet (`opensAt`: the app writes the window's opening time), or null = the button.
 */
export type LessonWait = 'cancelled' | 'closed' | 'noWayIn' | 'opensAt';

type WaitRule = readonly [(lesson: PortalLesson, state: JoinState) => boolean, LessonWait];

const isCancelled = (l: PortalLesson): boolean => l.status.startsWith('cancelled');
const isOver = (l: PortalLesson, s: JoinState): boolean =>
  s === 'closed' || !isOpenLesson(l.status);
const noWayKnown = (l: PortalLesson): boolean => l.way_in === 'none';
const isEarly = (_: PortalLesson, s: JoinState): boolean => s === 'early';
// The API sends the external link only while the room is open: until the next read it may lack.
const linkMissing = (l: PortalLesson): boolean => l.way_in === 'external' && !l.meeting_url;

/** First match wins, in this order (the card's old waitText, now shared). */
const WAIT_RULES: readonly WaitRule[] = [
  [isCancelled, 'cancelled'],
  [isOver, 'closed'],
  [noWayKnown, 'noWayIn'],
  [isEarly, 'opensAt'],
  [linkMissing, 'noWayIn'],
];

export function lessonWait(lesson: PortalLesson, now: Date): LessonWait | null {
  const state = windowStateAt(lesson.window, now);
  return WAIT_RULES.find(([applies]) => applies(lesson, state))?.[1] ?? null;
}

/** Still ahead for the family: not cancelled, open, and its window not closed yet. */
export const isAhead = (lesson: PortalLesson, now: Date): boolean =>
  !isCancelled(lesson) && !isOver(lesson, windowStateAt(lesson.window, now));

/** The home card's lesson: the first one still ahead (the API sends them by start). */
export const nextLesson = (lessons: readonly PortalLesson[], now: Date): PortalLesson | null =>
  lessons.find((l) => isAhead(l, now)) ?? null;
