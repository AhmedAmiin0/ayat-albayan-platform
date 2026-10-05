import { SETTING_DEFAULTS } from '../settings/registry.js';
import { joinWindowConfig, type JoinWindowConfig } from '../settings/public.js';

/**
 * The registry defaults (15 min before, 120 after): settings.join_opens_before_min /
 * join_closes_after_min. Callers pass the live values (GET /settings/public on the clients).
 */
export const DEFAULT_JOIN_WINDOW: JoinWindowConfig = joinWindowConfig(SETTING_DEFAULTS);

const MIN_MS = 60_000;

export type JoinState = 'early' | 'open' | 'closed';

export interface JoinWindow {
  state: JoinState;
  /** ISO instants of the two edges, for «بيفتح الساعة …» messages. */
  opens_at: string;
  closes_at: string;
}

/** What the window reads of a lesson; room_opened_at = «افتح الحلقة الآن» (lessons.room_opened_at). */
export interface WindowLesson {
  starts_at: string;
  ends_at: string;
  room_opened_at?: string | null | undefined;
}

/**
 * Window of a lesson at `now`. Edges are inclusive, so the boundary minute still joins. A room
 * opened early by staff opens at min(room_opened_at, starts_at − opensBeforeMin).
 */
export function joinWindow(lesson: WindowLesson, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): JoinWindow {
  const usual = Date.parse(lesson.starts_at) - win.opensBeforeMin * MIN_MS;
  const opened = lesson.room_opened_at ? Date.parse(lesson.room_opened_at) : Number.NaN;
  const opens = Number.isNaN(opened) ? usual : Math.min(opened, usual);
  const closes = Date.parse(lesson.ends_at) + win.closesAfterMin * MIN_MS;
  const t = now.getTime();
  const state: JoinState = t < opens ? 'early' : t > closes ? 'closed' : 'open';
  return { state, opens_at: new Date(opens).toISOString(), closes_at: new Date(closes).toISOString() };
}

/** What the «ادخل الحلقة» buttons check (the API checks again). */
export const canJoinNow = (lesson: WindowLesson, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): boolean =>
  joinWindow(lesson, now, win).state === 'open';

/** The instant a lesson's room closes (a guest link expires then). */
export const roomClosesAt = (lesson: { ends_at: string }, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): string =>
  new Date(Date.parse(lesson.ends_at) + win.closesAfterMin * MIN_MS).toISOString();
