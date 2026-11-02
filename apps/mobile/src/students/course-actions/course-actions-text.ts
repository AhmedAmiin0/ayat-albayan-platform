import { courseStopErrorCode, courseStopLessonsText } from '@ab/client-core';
import type { CourseStopPreview } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { localDay, money } from '@/payments';

// What «إلغاء الاشتراك» says on mobile: the shared lines (@ab/client-core), the app's words.

/** A failed stop: its `t.courseActions.errors` line (generic for anything unknown). */
export const stopErrorText = (error: unknown): string =>
  t.courseActions.errors[courseStopErrorCode(error)];

/** The sheet's promises: lessons cancelled, the schedule ends, money and history kept, status. */
export function stopLines(preview: CourseStopPreview): string[] {
  const s = t.courseActions.stop;
  return [
    courseStopLessonsText(s.lessons, preview),
    s.schedule,
    s.money.replace('{amount}', money(preview.paid, preview.currency)),
    s.history,
    s.status,
  ];
}

/** «أُلغي الاشتراك في …» and its reason, for a package already cancelled. */
export function stoppedLines(stopped: NonNullable<CourseStopPreview['stopped']>): string[] {
  const s = t.courseActions.stop;
  const day = localDay(stopped.at.slice(0, 10));
  return [
    s.stopped.replace('{date}', day),
    ...(stopped.reason ? [s.stoppedReason.replace('{reason}', stopped.reason)] : []),
  ];
}
