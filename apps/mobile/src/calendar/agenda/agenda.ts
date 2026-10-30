import { sameClockAt, type ClockCycle, type LessonView } from '@ab/shared';
import { clockIn } from '@/core/lib/clock';
import { cityOf } from '@/booking/shared/slots';
import { clockAt } from '@/inbox/shared/format';
import { t } from '@/core/lib/i18n/i18n';
import { gridTz, slotRange } from '@/more/schedule';
import type { AvailabilityRow } from '@/more/types';
import { localDate, visibleLessons } from '@/today/lib/timeline';
import { addDays, weekdayOf } from '../lib/week';

// What the agenda lays out (R-SCH-01, R-TCH-02): lessons by the viewer's day or by teacher, the
// teacher's own clock beside the viewer's, a day's availability. Closed lessons (cancelled,
// moved) stay hidden, as on Today. Pure, unit-tested.

export interface AgendaDay {
  /** The viewer's calendar day, YYYY-MM-DD. */
  date: string;
  lessons: LessonView[];
}

/**
 * The 7 days from `start`, each with its lessons on the viewer's calendar `tz`, earliest first: the
 * day a lesson sits under is the day its clock reads in (a Cairo teacher's 00:30 Riyadh Sunday
 * lesson is Saturday 23:30 for them, so under السبت). The week window is the same zone's (weekWindow).
 */
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

/**
 * «عند المعلم/ة 15:00 بتوقيت القاهرة» when the teacher's wall clock reads differently from the
 * viewer's `viewer` zone (a Riyadh admin, Cairo in winter); null when it reads the same. Past
 * midnight it names the teacher's day: «عند المعلم/ة الجمعة 23:30 بتوقيت القاهرة».
 */
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

/**
 * The faint availability line of a day: «متاح 16:00 – 18:00، 20:00 – 22:00 بتوقيت القاهرة». The
 * weekly grid is read in the zone it was saved in, named in the line. ponytail: the weekday is
 * matched as is, so a window past midnight in that zone sits on its own weekday, not Riyadh's.
 */
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

/**
 * The screen's subtitle parts joined with « · », plus «آخر تحديث 16:20» while a refetch failed over
 * saved data (offline; there is no NetInfo), so the admin knows how old the list is.
 */
export function headerLine(
  parts: readonly string[],
  query: { isError: boolean; data: unknown; dataUpdatedAt: number },
  cycle: ClockCycle,
): string {
  const stale = query.isError && query.data !== undefined;
  return [...parts, ...(stale ? [t.mobile.lastUpdated.replace('{time}', clockAt(query.dataUpdatedAt, cycle))] : [])].join(' · ');
}
