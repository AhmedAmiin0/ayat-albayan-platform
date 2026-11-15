import { counted, dateText } from '@ab/shared';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// What the «جدولي» month view says (owner 2026-11-14): its title, the weekday heads, a day's name.

const noon = (date: string) => new Date(`${date}T12:00:00Z`);

/** "2026-11" → «نوفمبر 2026» (mid-month UTC: no zone can push it to another month). */
export const monthTitle = (month: string): string =>
  dateText(noon(`${month}-15`), { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });

/** A weekday head: «السبت», and its one-letter form for narrow cells. */
export const weekdayHead = (date: string): { long: string; narrow: string } => ({
  long: dateText(noon(date), { tz: 'UTC', locale }, { weekday: 'long' }),
  narrow: dateText(noon(date), { tz: 'UTC', locale }, { weekday: 'narrow' }),
});

/** The day number in the cell. */
export const dayNumber = (date: string): string =>
  dateText(noon(date), { tz: 'UTC', locale }, { day: 'numeric' });

/** A cell's name for assistive tech: «14 نوفمبر، حلقتان». */
export const dayCellLabel = (date: string, count: number): string =>
  t.teacherSchedule.dayCell
    .replace('{date}', dayMonthLabel(date))
    .replace('{count}', count > 0 ? counted(t.schedule.lessonCount, count) : t.teacherSchedule.noLessons);
