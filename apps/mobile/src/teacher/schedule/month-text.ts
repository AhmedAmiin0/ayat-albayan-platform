import { counted, dateText } from '@ab/shared';
import { dayLabel } from '@/calendar';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// What the «جدولي» month says (owner 2026-11-14): its name, the weekday heads, a cell's name.

const noon = (date: string) => new Date(`${date}T12:00:00Z`);
const text = (date: string, fields: Intl.DateTimeFormatOptions) =>
  dateText(noon(date), { tz: 'UTC', locale }, fields);

/** "2026-11" → «نوفمبر 2026». */
export const monthTitle = (month: string): string =>
  text(`${month}-15`, { month: 'long', year: 'numeric' });

/** «س» over Saturday's column (the full name is the column's spoken name). */
export const weekdayNarrow = (date: string): string => text(date, { weekday: 'narrow' });

export const dayNumber = (date: string): string => text(date, { day: 'numeric' });

const countText = (n: number) =>
  n > 0 ? counted(t.schedule.lessonCount, n) : t.teacherSchedule.noLessons;

/** «السبت 14 نوفمبر، حلقتان» / «… لا حلقات». */
export const dayCellLabel = (date: string, count: number): string =>
  t.teacherSchedule.dayCell
    .replace('{date}', dayLabel(date))
    .replace('{count}', countText(count));
