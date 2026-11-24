import { counted } from '@ab/core';
import { dateText } from '@ab/time';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

const noon = (date: string) => new Date(`${date}T12:00:00Z`);

/** Mid-month UTC so no time zone can push it to another month. */
export const monthTitle = (month: string): string =>
  dateText(noon(`${month}-15`), { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });

export const weekdayHead = (date: string): { long: string; narrow: string } => ({
  long: dateText(noon(date), { tz: 'UTC', locale }, { weekday: 'long' }),
  narrow: dateText(noon(date), { tz: 'UTC', locale }, { weekday: 'narrow' }),
});

/** The day number in the cell. */
export const dayNumber = (date: string): string =>
  dateText(noon(date), { tz: 'UTC', locale }, { day: 'numeric' });

export const dayCellLabel = (date: string, count: number): string =>
  t.teacherSchedule.dayCell
    .replace('{date}', dayMonthLabel(date))
    .replace('{count}', count > 0 ? counted(t.schedule.lessonCount, count) : t.teacherSchedule.noLessons);
