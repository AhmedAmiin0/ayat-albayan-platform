/** The classroom window in minutes (joinWindow's third argument). */
export interface JoinWindowConfig {
  opensBeforeMin: number;
  closesAfterMin: number;
}

/** settings.join_opens_before_min / join_closes_after_min → the window joinWindow takes. */
export const joinWindowConfig = (s: {
  join_opens_before_min: number;
  join_closes_after_min: number;
}): JoinWindowConfig => ({
  opensBeforeMin: s.join_opens_before_min,
  closesAfterMin: s.join_closes_after_min,
});

/**
 * The registry defaults of settings.join_opens_before_min / join_closes_after_min, pinned by
 * shared join-window.registry.test.ts. Callers pass the live values (GET /settings/public).
 */
export const DEFAULT_JOIN_WINDOW: JoinWindowConfig = { opensBeforeMin: 15, closesAfterMin: 120 };

const MIN_MS = 60_000;

export type JoinState = 'early' | 'open' | 'closed';

export interface JoinWindow {
  state: JoinState;
  /** ISO instants of the two edges, for opening-time messages. */
  opens_at: string;
  closes_at: string;
}

/** room_opened_at is set when the room is opened early (lessons.room_opened_at). */
export interface WindowLesson {
  starts_at: string;
  ends_at: string;
  room_opened_at?: string | null | undefined;
}

/**
 * Window of a lesson at `now`. Edges are inclusive, so the boundary minute still joins. A room
 * opened early by staff opens at min(room_opened_at, starts_at − opensBeforeMin).
 */
export function joinWindow(
  lesson: WindowLesson,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): JoinWindow {
  const usual = Date.parse(lesson.starts_at) - win.opensBeforeMin * MIN_MS;
  const opened = lesson.room_opened_at ? Date.parse(lesson.room_opened_at) : Number.NaN;
  const opens = Number.isNaN(opened) ? usual : Math.min(opened, usual);
  const closes = Date.parse(lesson.ends_at) + win.closesAfterMin * MIN_MS;
  const t = now.getTime();
  const state: JoinState = t < opens ? 'early' : t > closes ? 'closed' : 'open';
  return {
    state,
    opens_at: new Date(opens).toISOString(),
    closes_at: new Date(closes).toISOString(),
  };
}

/** What the join buttons check; the API checks again. */
export const canJoinNow = (
  lesson: WindowLesson,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): boolean => joinWindow(lesson, now, win).state === 'open';

/** The instant a lesson's room closes (a guest link expires then). */
export const roomClosesAt = (
  lesson: { ends_at: string },
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): string => new Date(Date.parse(lesson.ends_at) + win.closesAfterMin * MIN_MS).toISOString();
