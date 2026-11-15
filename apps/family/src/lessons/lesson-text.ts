import { dayWord, type DayWord } from '@ab/client-core';
import {
  clockOf,
  dateText,
  monthText,
  teacherName,
  type ClockOptions,
  type PortalLesson,
  type PortalTeacher,
} from '@ab/shared';
import { locale, t } from '@ab/mobile-kit';

// A lesson's time in the family's words (Western digits, the viewer's 12 / 24 h cycle), on the
// clock it is given (the student's zone for one child, the phone's for the week).

const DAY_WORD: Record<DayWord, () => string> = {
  today: () => t.portal.app.lesson.today,
  tomorrow: () => t.portal.app.lesson.tomorrow,
};

/** «اليوم» / «غدًا» / «الأحد 16 نوفمبر». */
export function dayText(at: Date, clock: ClockOptions, now: Date): string {
  const word = dayWord(at, now, clock.tz);
  return word
    ? DAY_WORD[word]()
    : dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** «اليوم 6:30 م». */
export const whenText = (at: Date, clock: ClockOptions, now: Date): string =>
  `${dayText(at, clock, now)} ${clockOf(at, clock)}`;

/** «6:30 – 7:15 م». */
export const rangeText = (l: Pick<PortalLesson, 'starts_at' | 'ends_at'>, clock: ClockOptions) =>
  `${clockOf(new Date(l.starts_at), clock)} – ${clockOf(new Date(l.ends_at), clock)}`;

/** The date tile: «الأحد» over «16». */
export const dayTile = (at: Date, clock: ClockOptions): { weekday: string; day: string } => ({
  weekday: dateText(at, clock, { weekday: 'long' }),
  day: dateText(at, clock, { day: 'numeric' }),
});

/** «الخميس 13 نوفمبر». */
export const dateLine = (at: Date, clock: ClockOptions): string =>
  dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });

/** The teacher's name in the UI language. */
export const teacherText = (teacher: PortalTeacher): string => teacherName(teacher, locale);

/** «نوفمبر 2026» of a «YYYY-MM» month. */
export const monthTitle = (month: string): string => monthText(month, locale);
