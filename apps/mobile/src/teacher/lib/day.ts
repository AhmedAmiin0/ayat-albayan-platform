import { reportBlock, type LessonStatus, type LessonView, type PendingReportView } from '@ab/shared';
import { localDate } from '@/today/lib/timeline';

// «اليوم» for the teacher (R-TCH-03): her own lessons on her own calendar day, in her zone. Pure.

const HOUR = 3_600_000;
/** No lesson took place: nothing to do or report. An excused lesson stays (its report is due). */
const GONE: readonly LessonStatus[] = ['rescheduled', 'cancelled_by_teacher', 'cancelled_by_admin'];

/**
 * GET /teachers/me/lessons `from`/`to` sure to hold every lesson that starts on `date` in any zone
 * (UTC−12 … UTC+14), so no zone or DST arithmetic is needed; lessonsOn keeps the day's own. Stable
 * for the whole day, so the query key (and the saved cache) changes only at midnight.
 */
export function dayWindow(date: string): { from: string; to: string } {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  return { from: new Date(midnight - 14 * HOUR).toISOString(), to: new Date(midnight + 36 * HOUR).toISOString() };
}

/** The lessons starting on `date` in `tz`, earliest first; cancelled and moved ones stay out. */
export function lessonsOn(lessons: readonly LessonView[], date: string, tz: string): LessonView[] {
  return lessons
    .filter((l) => localDate(new Date(l.starts_at), tz) === date && !GONE.includes(l.status))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export type ReportAction = 'open' | 'edit' | 'view';

/**
 * What a lesson card offers for its report: nothing before the lesson starts (or for a cancelled
 * one), «اكتب التقرير» / «تعديل التقرير» while it is on the pending list (a draft exists or not),
 * else «عرض التقرير». The pending list not loaded yet: «اكتب التقرير».
 */
export function reportAction(
  lesson: LessonView,
  pending: readonly PendingReportView[] | undefined,
  now: Date,
): ReportAction | null {
  if (reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now }) !== null) return null;
  if (!pending) return 'open';
  const mine = pending.filter((p) => p.lesson_id === lesson.id);
  if (mine.length === 0) return 'view';
  return mine.some((p) => p.report_id !== null) ? 'edit' : 'open';
}
