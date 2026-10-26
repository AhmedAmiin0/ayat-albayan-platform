import { clockTime, RIYADH_TZ, type LessonView } from '@ab/shared';
import { cityOf } from '@/booking/shared/slots';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { gridTz, slotRange } from '@/more/schedule';
import type { AvailabilityRow } from '@/more/types';
import { localDate, visibleLessons } from '@/today/timeline';
import { ltr } from '@/core/ui/primitives/Ltr';
import { addDays, weekdayOf } from '../lib/week';

// What the agenda lays out (R-SCH-01, R-TCH-02): lessons by Riyadh day or by teacher, the
// teacher's own clock, and a day's availability. Closed lessons (cancelled, moved) stay hidden,
// as on Today. Pure, unit-tested.

export interface AgendaDay {
  /** Riyadh calendar day, YYYY-MM-DD. */
  date: string;
  lessons: LessonView[];
}

/** `count` days from `start`, each with its lessons on the Riyadh calendar, earliest first. */
export function agendaDays(lessons: readonly LessonView[], start: string, count = 7): AgendaDay[] {
  const days: AgendaDay[] = Array.from({ length: count }, (_, i) => ({ date: addDays(start, i), lessons: [] }));
  for (const lesson of visibleLessons(lessons)) {
    const date = localDate(new Date(lesson.starts_at), RIYADH_TZ);
    days.find((d) => d.date === date)?.lessons.push(lesson);
  }
  return days;
}

/**
 * «عند المعلم/ة 15:00 بتوقيت القاهرة» when the teacher's wall clock reads differently from
 * Riyadh's (Cairo in winter); null when it reads the same (Riyadh, or Cairo on summer time). Past
 * midnight it names the teacher's day: «عند المعلم/ة الجمعة 23:30 بتوقيت القاهرة».
 */
export function teacherClock(lesson: LessonView): string | null {
  const at = new Date(lesson.starts_at);
  const { tz } = lesson.teacher;
  const time = clockTime(at, tz);
  if (time === clockTime(at, RIYADH_TZ)) return null;
  const date = localDate(at, tz);
  const day = date === localDate(at, RIYADH_TZ) ? '' : `${weekday[String(weekdayOf(date))]} `;
  return t.booking.teacherClock.replace('{time}', `${day}${time}`).replace('{city}', cityOf(tz));
}

const weekday: Record<string, string> = t.enums.weekday;

/**
 * The faint availability line of a day: «متاح 16:00 – 18:00، 20:00 – 22:00 بتوقيت القاهرة». The
 * weekly grid is read in the zone it was saved in, named in the line. ponytail: the weekday is
 * matched as is, so a window past midnight in that zone sits on its own weekday, not Riyadh's.
 */
export function availabilityLine(
  rows: readonly AvailabilityRow[],
  date: string,
  teacherTz: string,
): string | null {
  const day = rows
    .filter((r) => r.weekday === weekdayOf(date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (day.length === 0) return null;
  return t.calendar.available
    .replace('{ranges}', day.map((r) => ltr(slotRange(r))).join(t.common.listSeparator))
    .replace('{city}', cityOf(gridTz(rows, teacherTz)));
}

/**
 * The screen's subtitle parts joined with « · », plus «آخر تحديث 16:20» while a refetch failed over
 * saved data (offline; there is no NetInfo), so the admin knows how old the list is.
 */
export function headerLine(
  parts: readonly string[],
  query: { isError: boolean; data: unknown; dataUpdatedAt: number },
): string {
  const stale = query.isError && query.data !== undefined;
  return [...parts, ...(stale ? [t.mobile.lastUpdated.replace('{time}', clockAt(query.dataUpdatedAt))] : [])].join(' · ');
}
