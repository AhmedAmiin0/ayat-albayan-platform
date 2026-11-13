import { isClosedLesson, type LessonView } from '@ab/shared';
import { localDate } from '@/today/lib/timeline';

// «اليوم» for the teacher (R-TCH-03): her own lessons on her own calendar day, in her zone. Pure.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * GET /teachers/me/lessons `from`/`to` sure to hold every lesson that starts on `date` in any zone
 * (UTC−12 … UTC+14), so no zone or DST arithmetic is needed; lessonsOn keeps the day's own. Stable
 * for the whole day, so the query key (and the saved cache) changes only at midnight.
 */
export function dayWindow(date: string): { from: string; to: string } {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  return {
    from: new Date(midnight - 14 * HOUR).toISOString(),
    to: new Date(midnight + 36 * HOUR).toISOString(),
  };
}

/**
 * The lessons starting on `date` in `tz`, earliest first; cancelled and moved ones stay out (no
 * lesson took place). An excused lesson stays: its report is due.
 */
export function lessonsOn(lessons: readonly LessonView[], date: string, tz: string): LessonView[] {
  return lessons
    .filter((l) => localDate(new Date(l.starts_at), tz) === date && !isClosedLesson(l.status))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/**
 * «اليوم»'s one lessons read (docs/48): dayWindow's padded start, then 15 days on, so lessonsOn
 * still finds today's lessons and nextOpenLesson the next one within two weeks. Under the API's
 * 31-day cap and stable for the whole day.
 */
export function aheadWindow(date: string): { from: string; to: string } {
  const { from } = dayWindow(date);
  return { from, to: new Date(Date.parse(from) + 15 * DAY).toISOString() };
}
