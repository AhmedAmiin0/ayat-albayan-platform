import { dateRangeText, dateText } from '@ab/time';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// A week's days are calendar dates («YYYY-MM-DD») already on the viewer's clock: they are read at
// noon UTC so no zone moves them.

const UTC = { tz: 'UTC', locale } as const;
const LONG = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const DAY_MONTH = { day: 'numeric', month: 'long' } as const;

/** The day's noon (UTC), for the date formatters. */
export const dayDate = (day: string): Date => new Date(`${day}T12:00:00Z`);

/** The calendar options a day is read with. */
export const dayClock = UTC;

/** «الأحد 16 نوفمبر». */
export const longDay = (day: string): string => dateText(dayDate(day), UTC, LONG);

/** «15 – 21 نوفمبر»: the week's first and last day. */
export const rangeOf = (range: { from: string; to: string }): string =>
  dateRangeText({ from: dayDate(range.from), to: dayDate(range.to) }, UTC, DAY_MONTH);

/** The id of a day's section in the agenda (the strip jumps to it). */
export const dayId = (day: string): string => `schedule-day-${day}`;
