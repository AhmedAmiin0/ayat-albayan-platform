import { dayWord, lessonMinutes, type DayWord } from '@ab/client-core';
import type { PortalLesson, PortalTeacher } from '@ab/shared';
import { teacherName } from '@ab/schedule';
import { clockOf, dateText, type ClockOptions } from '@ab/time';
import { locale, t } from '@ab/mobile-kit';
import type { OptionsTitle } from './options/OptionsMenu';

// A lesson's time in the family's words (Western digits, the viewer's 12 / 24 h cycle), on the
// clock it is given (the student's zone for one child, the phone's for the week).

const DAY_WORD: Record<DayWord, () => string> = {
  today: () => t.portal.app.lesson.today,
  tomorrow: () => t.portal.app.lesson.tomorrow,
};

function dayText(at: Date, clock: ClockOptions, now: Date): string {
  const word = dayWord(at, now, clock.tz);
  return word
    ? DAY_WORD[word]()
    : dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
}

export const whenText = (at: Date, clock: ClockOptions, now: Date): string =>
  `${dayText(at, clock, now)} ${clockOf(at, clock)}`;

export const rangeText = (l: Pick<PortalLesson, 'starts_at' | 'ends_at'>, clock: ClockOptions) =>
  `${clockOf(new Date(l.starts_at), clock)} – ${clockOf(new Date(l.ends_at), clock)}`;

export const dateLine = (at: Date, clock: ClockOptions): string =>
  dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });

/** The teacher's name in the UI language. */
export const teacherText = (teacher: PortalTeacher): string => teacherName(teacher, locale);

const LESSON_DAY: Record<DayWord, () => string> = {
  today: () => t.portal.actions.lessonToday,
  tomorrow: () => t.portal.actions.lessonTomorrow,
};

function lessonName(at: Date, clock: ClockOptions, now: Date): string {
  const word = dayWord(at, now, clock.tz);
  return word ? LESSON_DAY[word]() : t.portal.actions.lessonOn.replace('{date}', dateLine(at, clock));
}

export function optionsTitle(lesson: PortalLesson, clock: ClockOptions, now: Date): OptionsTitle {
  const at = new Date(lesson.starts_at);
  const name = lessonName(at, clock, now);
  const teacher = t.portal.withTeacher.replace('{teacher}', teacherText(lesson.teacher));
  const minutes = t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson)));
  return {
    heading: `${name} · ${rangeText(lesson, clock)}`,
    subline: [dateLine(at, clock), teacher, minutes].join(' · '),
    decline: t.portal.actions.declineTitleOf.replace('{lesson}', name),
  };
}
