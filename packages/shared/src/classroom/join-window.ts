/** A classroom opens 15 minutes before the lesson starts … */
export const JOIN_OPENS_BEFORE_MIN = 15;
/** … and closes 2 hours after it ends. */
export const JOIN_CLOSES_AFTER_MIN = 120;

const MIN_MS = 60_000;

export type JoinState = 'early' | 'open' | 'closed';

export interface JoinWindow {
  state: JoinState;
  /** ISO instants of the two edges, for «بيفتح الساعة …» messages. */
  opens_at: string;
  closes_at: string;
}

/** Window of a lesson at `now`. Edges are inclusive, so the boundary minute still joins. */
export function joinWindow(lesson: { starts_at: string; ends_at: string }, now: Date): JoinWindow {
  const opens = Date.parse(lesson.starts_at) - JOIN_OPENS_BEFORE_MIN * MIN_MS;
  const closes = Date.parse(lesson.ends_at) + JOIN_CLOSES_AFTER_MIN * MIN_MS;
  const t = now.getTime();
  const state: JoinState = t < opens ? 'early' : t > closes ? 'closed' : 'open';
  return { state, opens_at: new Date(opens).toISOString(), closes_at: new Date(closes).toISOString() };
}

/** What the «ادخل الحلقة» buttons check (the API checks again). */
export const canJoinNow = (lesson: { starts_at: string; ends_at: string }, now: Date): boolean =>
  joinWindow(lesson, now).state === 'open';
