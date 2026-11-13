import { isOpenLesson, type LessonView } from '@ab/shared';

// The hero lesson of «اليوم» (docs/29, docs/48): moved from the mobile today-plan.ts, unchanged in
// behaviour. Pure, so web and mobile pick the same lesson from the same clock.

const MINUTE = 60_000;

/** What the hero reads of a lesson. */
export type HeroLesson = Pick<LessonView, 'status' | 'starts_at' | 'ends_at'>;

export type Hero<L extends HeroLesson = HeroLesson> =
  | { kind: 'running'; lesson: L }
  /** `minutes`: whole minutes to the start, rounded up (a start 30 s away is «بعد دقيقة»). */
  | { kind: 'next'; lesson: L; minutes: number };

const ended = (l: HeroLesson, at: number) => Date.parse(l.ends_at) <= at;
const ahead = (l: HeroLesson, at: number) => Date.parse(l.starts_at) > at;

/** The first open lesson starting after now (the «حلقتك القادمة» pointer), or null. */
export function nextOpenLesson<L extends HeroLesson>(lessons: readonly L[], now: Date): L | null {
  const at = now.getTime();
  return lessons.find((l) => isOpenLesson(l.status) && ahead(l, at)) ?? null;
}

const minutesTo = (l: HeroLesson, at: number) => Math.ceil((Date.parse(l.starts_at) - at) / MINUTE);

const nextHero = <L extends HeroLesson>(next: L | undefined, at: number): Hero<L> | null =>
  next ? { kind: 'next', lesson: next, minutes: minutesTo(next, at) } : null;

/**
 * The hero card's lesson: one under way wins (the earliest started), else the next open one still
 * ahead, else none (the quiet day). Only open lessons: a held or no-show lesson is not «التالية».
 */
export function pickHero<L extends HeroLesson>(lessons: readonly L[], now: Date): Hero<L> | null {
  const at = now.getTime();
  const open = lessons.filter((l) => isOpenLesson(l.status) && !ended(l, at));
  const running = open.find((l) => !ahead(l, at));
  if (running) return { kind: 'running', lesson: running };
  return nextHero(open.find((l) => ahead(l, at)), at);
}
