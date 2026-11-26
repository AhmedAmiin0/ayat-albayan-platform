import { lessonWhenAt, type ReportPageView } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

/** Formatted on the student's clock. */
export const whoWhen = (view: ReportPageView, clock: ClockOptions): string =>
  `${view.student.name} · ${lessonWhenAt(new Date(view.lesson.starts_at), { ...clock, tz: view.tz })}`;
