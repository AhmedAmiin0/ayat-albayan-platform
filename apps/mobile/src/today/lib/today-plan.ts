import { isOpenLesson, RIYADH_TZ, type LessonView } from '@ab/shared';
import { applyFilter, type TodayFilter } from './timeline';

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

export type Hero =
  | { kind: 'running'; lesson: LessonView }
  /** `minutes`: whole minutes to the start, rounded up (a start 30 s away is «بعد دقيقة»). */
  | { kind: 'next'; lesson: LessonView; minutes: number };

const ended = (l: LessonView, at: number) => Date.parse(l.ends_at) <= at;

/**
 * The hero card's lesson: one under way wins (the earliest started), else the next open one still
 * ahead, else none (the quiet day). Only open lessons: a held or no-show lesson is not «التالية».
 */
export function pickHero(lessons: readonly LessonView[], now: Date): Hero | null {
  const at = now.getTime();
  const open = lessons.filter((l) => isOpenLesson(l.status) && !ended(l, at));
  const running = open.find((l) => Date.parse(l.starts_at) <= at);
  if (running) return { kind: 'running', lesson: running };
  const next = open.find((l) => Date.parse(l.starts_at) > at);
  if (!next) return null;
  return { kind: 'next', lesson: next, minutes: Math.ceil((Date.parse(next.starts_at) - at) / MINUTE) };
}

export interface TodayPlan {
  /** Only under «الكل»: a column filter shows that status's lessons as rows, the hero among them. */
  hero: Hero | null;
  /** «بقية اليوم»: not ended and not the hero, under the filter. */
  rest: LessonView[];
  /** Ended today (any shown status), under the filter: folded into one quiet row. */
  ended: LessonView[];
  /** Nothing left today (no hero, nothing ahead) though the day had lessons. */
  quiet: boolean;
}

/** `lessons`: the day's visible lessons (visibleLessons), earliest first. */
export function todayPlan(lessons: readonly LessonView[], filter: TodayFilter, now: Date): TodayPlan {
  const at = now.getTime();
  const hero = filter === 'all' ? pickHero(lessons, now) : null;
  const shown = applyFilter(lessons, filter);
  const rest = shown.filter((l) => !ended(l, at) && l.id !== hero?.lesson.id);
  const left = lessons.some((l) => !ended(l, at));
  return { hero, rest, ended: shown.filter((l) => ended(l, at)), quiet: lessons.length > 0 && !left };
}
