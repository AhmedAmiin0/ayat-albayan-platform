import { type Hero, pickHero } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { lessonsOnDay } from '@/features/teaching/schedule';

export interface HomeToday {
  /** The hero of today (pickHero on her calendar day); null on a quiet day or while loading. */
  hero: Hero<LessonView> | null;
}

const LOADING: HomeToday = { hero: null };

/** The home's top line (docs/48) from the window's lessons, on her clock and her day. */
export function homeToday(
  lessons: readonly LessonView[] | undefined,
  at: { now: Date; today: string; tz: string },
): HomeToday {
  if (!lessons) return LOADING;
  const todays = lessonsOnDay(lessons, { date: at.today, tz: at.tz });
  return { hero: pickHero(todays, at.now) };
}
