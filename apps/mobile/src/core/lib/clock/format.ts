import {
  clockOf,
  clockOfHhmm,
  clockRange,
  isolateClock,
  lessonWhenAt,
  type ClockCycle,
} from '@ab/shared';
import { locale } from '@/core/lib/i18n/locale';

// The shared clock formatters bound to this run's UI language: screens pass the cycle from
// useClockCycle(), so a change of «تنسيق الوقت» re-renders them with the new form.

/** «17:30» / «5:30 م»: `date` on the wall clock of `tz`. */
export const clockIn = (date: Date, tz: string, cycle: ClockCycle): string => clockOf(date, { tz, cycle, locale });

/** A stored «HH:MM» for display. */
export const hhmm = (value: string, cycle: ClockCycle): string => clockOfHhmm(value, cycle, locale);

/** «الأحد 4 أكتوبر 5:00 م»: the lesson date-time line in `tz`. */
export const whenIn = (date: Date, tz: string, cycle: ClockCycle): string => lessonWhenAt(date, { tz, cycle, locale });

/** «16:00 – 18:00» / «4:00 م – 6:00 م», isolated (LTR, or RTL for Arabic 12 h). */
export const rangeOf = (from: string, to: string, cycle: ClockCycle): string => clockRange(from, to, { cycle, locale });

/** One clock isolated inside a sentence the same way as a range. */
export const isolated = (clock: string, cycle: ClockCycle): string => isolateClock(clock, cycle, locale);

/** «3 أكتوبر، 4:30 م» / «3 Oct, 4:30 PM»: a date and its clock joined as Intl joins them. */
export const dateWithClock = (date: string, clock: string): string => `${date}${locale === 'ar' ? '،' : ','} ${clock}`;
