import { trialOutcome, type SalesTrialLesson } from '@ab/shared';
import { type TrialLessonRead, trialLessonsOf } from '../../../teaching/booking';

/**
 * «الحلقة التجريبية» (owner 2026-10-28): the trial lessons as «مواعيد الحلقة التجريبية» finds them (a
 * platform trial rule or an imported free lesson, trialLessonsOf), newest first; a moved date stays.
 */
export function toTrialLessons(rows: readonly TrialLessonRead[], now: Date): SalesTrialLesson[] {
  return trialLessonsOf(rows)
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
    .map((l) => ({
      lesson_id: l.id,
      starts_at: new Date(l.starts_at).toISOString(),
      status: l.status,
      outcome: trialOutcome({ status: l.status, attendance: l.attendance, starts_at: l.starts_at, now }),
      teacher_name: l.teacher?.display_name_ar ?? null,
    }));
}
