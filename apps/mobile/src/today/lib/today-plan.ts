import { isOpenLesson, RIYADH_TZ } from '@ab/shared';
import { applyFilter, type TodayFilter } from './timeline';
import type { TodayLesson } from './today-lesson';

// The calm «اليوم» (docs/29): which lesson is the hero, what stays in «بقية اليوم», what folds under
// «انتهت». Pure, so the screen only lays it out.

const MINUTE = 60_000;

/** «صباح الخير» before noon in Riyadh, «مساء الخير» from 12:00. */
export function greetingPart(now: Date): 'morning' | 'evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: RIYADH_TZ, hour: '2-digit', hourCycle: 'h23' }).format(now),
  );
  return hour < 12 ? 'morning' : 'evening';
}

export type Hero<L extends TodayLesson = TodayLesson> =
  | { kind: 'running'; lesson: L }
  /** `minutes`: whole minutes to the start, rounded up (a start 30 s away is «بعد دقيقة»). */
  | { kind: 'next'; lesson: L; minutes: number };

const ended = (l: TodayLesson, at: number) => Date.parse(l.ends_at) <= at;

/**
 * The hero card's lesson: one under way wins (the earliest started), else the next open one still
 * ahead, else none (the quiet day). Only open lessons: a held or no-show lesson is not «التالية».
 */
export function pickHero<L extends TodayLesson>(lessons: readonly L[], now: Date): Hero<L> | null {
  const at = now.getTime();
  const open = lessons.filter((l) => isOpenLesson(l.status) && !ended(l, at));
  const running = open.find((l) => Date.parse(l.starts_at) <= at);
  if (running) return { kind: 'running', lesson: running };
  const next = open.find((l) => Date.parse(l.starts_at) > at);
  if (!next) return null;
  return { kind: 'next', lesson: next, minutes: Math.ceil((Date.parse(next.starts_at) - at) / MINUTE) };
}

interface TodayPlan<L extends TodayLesson> {
  /** Only under «الكل»: a column filter shows that status's lessons as rows, the hero among them. */
  hero: Hero<L> | null;
  /** «بقية اليوم»: not ended and not the hero, under the filter. */
  rest: L[];
  /** Ended today (any shown status), under the filter: folded into one quiet row. */
  ended: L[];
  /** Nothing left today (no hero, nothing ahead) though the day had lessons. */
  quiet: boolean;
}

/** `lessons`: the day's visible lessons (visibleLessons), earliest first. */
export function todayPlan<L extends TodayLesson>(lessons: readonly L[], filter: TodayFilter, now: Date): TodayPlan<L> {
  const at = now.getTime();
  const hero = filter === 'all' ? pickHero(lessons, now) : null;
  const shown = applyFilter(lessons, filter);
  const rest = shown.filter((l) => !ended(l, at) && l.id !== hero?.lesson.id);
  const left = lessons.some((l) => !ended(l, at));
  return { hero, rest, ended: shown.filter((l) => ended(l, at)), quiet: lessons.length > 0 && !left };
}
