import { lessonWhenAt } from '@ab/shared';
import { clockOf, clockOfHhmm, clockRange, isolateClock, type ClockCycle } from '@ab/time';
import { locale } from '@ab/mobile-kit';

// Screens pass the cycle from useClockCycle(), so a format change re-renders them.

/** date on the wall clock of tz. */
export const clockIn = (date: Date, tz: string, cycle: ClockCycle): string => clockOf(date, { tz, cycle, locale });

/** A stored «HH:MM» for display. */
export const hhmm = (value: string, cycle: ClockCycle): string => clockOfHhmm(value, cycle, locale);

/** The lesson date-time line in tz. */
export const whenIn = (date: Date, tz: string, cycle: ClockCycle): string => lessonWhenAt(date, { tz, cycle, locale });

/** Isolated: LTR, or RTL for Arabic 12 h. */
export const rangeOf = (from: string, to: string, cycle: ClockCycle): string => clockRange(from, to, { cycle, locale });

/** One clock isolated inside a sentence the same way as a range. */
export const isolated = (clock: string, cycle: ClockCycle): string => isolateClock(clock, cycle, locale);

/** A date and its clock joined as Intl joins them. */
export const dateWithClock = (date: string, clock: string): string => `${date}${locale === 'ar' ? '،' : ','} ${clock}`;
