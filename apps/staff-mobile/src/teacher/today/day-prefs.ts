import type { HomePrefs } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import type { teacherDay } from './teacher-day';

// «تخصيص» on «اليوم» (owner 2026-11-14), applied to the day: a hidden hero leaves its lesson in
// «بقية اليوم» (first: it is under way or next), hidden ended lessons drop the fold. Pure.

type Day = ReturnType<typeof teacherDay>;

const restWithHero = (day: Day): LessonView[] =>
  day.hero ? [day.hero.lesson, ...day.rest] : day.rest;

/** The day as the screen draws it under her choices. */
export function shownDay(day: Day, prefs: Pick<HomePrefs, 'hero' | 'ended'>): Day {
  const heroOff = !prefs.hero;
  return {
    ...day,
    hero: heroOff ? null : day.hero,
    rest: heroOff ? restWithHero(day) : day.rest,
    noOther: heroOff ? false : day.noOther,
    ended: prefs.ended ? day.ended : [],
  };
}
