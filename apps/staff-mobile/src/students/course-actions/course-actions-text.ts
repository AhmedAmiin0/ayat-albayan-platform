import {
  courseStopErrorCode,
  courseStopLessonsText,
  datesText,
  stopDoneLines,
  type StopDone,
} from '@ab/client-core';
import type { CourseStopPreview, CourseStopResult } from '@ab/shared';
import { t, money } from '@ab/mobile-kit';
import { localDay } from '@/payments';
import { dayIn } from '@/students/course-card/card-text';

// What «إلغاء الاشتراك» says on mobile: the shared lines (@ab/client-core), the app's words.

/** A failed stop: its `t.courseActions.errors` line (generic for anything unknown). */
export const stopErrorText = (error: unknown): string =>
  t.courseActions.errors[courseStopErrorCode(error)];

/** «الحلقات الملغاة: …» when the answer lists them (absent in an old answer). */
const datesLine = (preview: CourseStopPreview, tz: string): string[] => {
  const starts = preview.futureStarts ?? [];
  if (starts.length === 0) return [];
  return [t.courseActions.stop.cancelsOn.replace('{dates}', datesText(starts, dayIn(tz)))];
};

/**
 * The sheet's promises: lessons cancelled (with their dates), the schedule ends, money kept (not
 * with «إلغاء مع استرداد»: `keeps` false), history kept, status.
 */
interface StopLinesInput {
  preview: CourseStopPreview;
  keeps: boolean;
  tz: string;
}

export function stopLines(input: StopLinesInput): string[] {
  const { preview, keeps, tz } = input;
  const s = t.courseActions.stop;
  const kept = s.money.replace('{amount}', money(preview.paid, preview.currency));
  return [
    courseStopLessonsText(s.lessons, preview),
    ...datesLine(preview, tz),
    s.schedule,
    ...(keeps ? [kept] : []),
    s.history,
    s.status,
  ];
}

/**
 * After a stop (owner 2026-11-17, board CourseXStopDone): what was done (with the refund's
 * amount), the student's status now, «الخطوة التالية» and who was told.
 */
export const stopDoneOf = (result: CourseStopResult, currency: string): StopDone =>
  stopDoneLines({
    result,
    words: t.courseActions.stop,
    format: {
      money: (amount) => money(amount, currency),
      status: (status) => t.enums.studentStatus[status],
    },
  });

/** «أُلغي الاشتراك في …» and its reason, for a package already cancelled. */
export function stoppedLines(stopped: NonNullable<CourseStopPreview['stopped']>): string[] {
  const s = t.courseActions.stop;
  const day = localDay(stopped.at.slice(0, 10));
  return [
    s.stopped.replace('{date}', day),
    ...(stopped.reason ? [s.stoppedReason.replace('{reason}', stopped.reason)] : []),
  ];
}
