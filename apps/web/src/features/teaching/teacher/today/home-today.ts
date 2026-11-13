import { type Hero, pickHero } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { lessonsOnDay } from '@/features/teaching/schedule';
import { splitToday } from './split-today';

export interface HomeToday {
  /** The hero of today (pickHero on her calendar day); null on a quiet day or while loading. */
  hero: Hero<LessonView> | null;
  /** The «اليوم n» count: today's open-to-come lessons, hero included; undefined while loading. */
  count: number | undefined;
}

const LOADING: HomeToday = { hero: null, count: undefined };

/** The home's top line (docs/48) from the window's lessons, on her clock and her day. */
export function homeToday(
  lessons: readonly LessonView[] | undefined,
  at: { now: Date; today: string; tz: string },
): HomeToday {
  if (!lessons) return LOADING;
  const todays = lessonsOnDay(lessons, { date: at.today, tz: at.tz });
  const hero = pickHero(todays, at.now);
  const { open } = splitToday(todays, { now: at.now, heroId: hero?.lesson.id ?? null });
  return { hero, count: open };
}
