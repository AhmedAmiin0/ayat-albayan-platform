import { counted, dateText } from '@ab/shared';
import { dayLabel } from '@/calendar';
import { t, locale } from '@ab/mobile-kit';

const noon = (date: string) => new Date(`${date}T12:00:00Z`);
const text = (date: string, fields: Intl.DateTimeFormatOptions) =>
  dateText(noon(date), { tz: 'UTC', locale }, fields);

export const monthTitle = (month: string): string =>
  text(`${month}-15`, { month: 'long', year: 'numeric' });

/** The full weekday is the column's spoken name. */
export const weekdayNarrow = (date: string): string => text(date, { weekday: 'narrow' });

export const dayNumber = (date: string): string => text(date, { day: 'numeric' });

const countText = (n: number) =>
  n > 0 ? counted(t.schedule.lessonCount, n) : t.teacherSchedule.noLessons;

export const dayCellLabel = (date: string, count: number): string =>
  t.teacherSchedule.dayCell
    .replace('{date}', dayLabel(date))
    .replace('{count}', countText(count));
