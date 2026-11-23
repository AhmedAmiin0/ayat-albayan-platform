import type { LessonView } from '@ab/schedule';
import { sameClockAt, type ClockCycle } from '@ab/time';
import { clockIn, type ViewerClock } from '@/core/lib/clock';
import { clockAt } from '@/inbox/shared/format';
import { t, cityOf } from '@ab/mobile-kit';
import { gridTz, slotRange } from '@/more/schedule';
import { localDate, visibleLessons } from '@/today/lib/timeline';
import { addDays, weekdayOf } from '@/calendar/lib/week';
import type { AvailabilityRow } from '@ab/shared';

// What the agenda lays out (R-SCH-01, R-TCH-02): lessons by the viewer's day or by teacher, the
// teacher's own clock beside the viewer's, a day's availability. Closed lessons (cancelled,
// moved) stay hidden, as on Today. Pure, unit-tested.

export interface AgendaDay {
  /** The viewer's calendar day, YYYY-MM-DD. */
  date: string;
  lessons: LessonView[];
}

/** A lesson sits under the day its clock reads in the viewer's tz, not Riyadh's. */
export function agendaDays(lessons: readonly LessonView[], start: string, tz: string): AgendaDay[] {
  const days: AgendaDay[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(start, i),
    lessons: [],
  }));
  for (const lesson of visibleLessons(lessons)) {
    const date = localDate(new Date(lesson.starts_at), tz);
    days.find((d) => d.date === date)?.lessons.push(lesson);
  }
  return days;
}

/** Shown when the teacher's wall clock differs from the viewer's; null when the same. */
export function teacherClock(lesson: LessonView, cycle: ClockCycle, viewer: string): string | null {
  const at = new Date(lesson.starts_at);
  const { tz } = lesson.teacher;
  if (sameClockAt(at, { a: tz, b: viewer })) return null;
  const time = clockIn(at, tz, cycle);
  const date = localDate(at, tz);
  const day = date === localDate(at, viewer) ? '' : `${weekday[String(weekdayOf(date))]} `;
  return t.booking.teacherClock.replace('{time}', `${day}${time}`).replace('{city}', cityOf(tz));
}

const weekday: Record<string, string> = t.enums.weekday;

/** Read in the saved zone; a window past midnight stays on its own weekday, not Riyadh's. */
export function availabilityLine(
  rows: readonly AvailabilityRow[],
  on: { date: string; teacherTz: string; cycle: ClockCycle },
): string | null {
  const { date, teacherTz, cycle } = on;
  const day = rows
    .filter((r) => r.weekday === weekdayOf(date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (day.length === 0) return null;
  return t.calendar.available
    .replace('{ranges}', day.map((r) => slotRange(r, cycle)).join(t.common.listSeparator))
    .replace('{city}', cityOf(gridTz(rows, teacherTz)));
}

/** Shows the last update time while a refetch failed over saved data (no NetInfo). */
export function headerLine(
  parts: readonly string[],
  query: { isError: boolean; data: unknown; dataUpdatedAt: number },
  viewer: ViewerClock,
): string {
  const stale = query.isError && query.data !== undefined;
  const at = () => clockAt(query.dataUpdatedAt, viewer.cycle, viewer.tz);
  return [...parts, ...(stale ? [t.mobile.lastUpdated.replace('{time}', at())] : [])].join(' · ');
}
