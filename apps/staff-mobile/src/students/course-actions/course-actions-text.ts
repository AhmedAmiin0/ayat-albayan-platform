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

/** A failed stop: its `t.courseActions.errors` line (generic for anything unknown). */
export const stopErrorText = (error: unknown): string =>
  t.courseActions.errors[courseStopErrorCode(error)];

/** Absent in an old answer. */
const datesLine = (preview: CourseStopPreview, tz: string): string[] => {
  const starts = preview.futureStarts ?? [];
  if (starts.length === 0) return [];
  return [t.courseActions.stop.cancelsOn.replace('{dates}', datesText(starts, dayIn(tz)))];
};

/** With refund chosen (`keeps` false) the money is not kept. */
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

export const stopDoneOf = (result: CourseStopResult, currency: string): StopDone =>
  stopDoneLines({
    result,
    words: t.courseActions.stop,
    format: {
      money: (amount) => money(amount, currency),
      status: (status) => t.enums.studentStatus[status],
    },
  });

export function stoppedLines(stopped: NonNullable<CourseStopPreview['stopped']>): string[] {
  const s = t.courseActions.stop;
  const day = localDay(stopped.at.slice(0, 10));
  return [
    s.stopped.replace('{date}', day),
    ...(stopped.reason ? [s.stoppedReason.replace('{reason}', stopped.reason)] : []),
  ];
}
