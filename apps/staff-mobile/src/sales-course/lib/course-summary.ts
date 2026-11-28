import type { BookingRequest, SalesCourseView } from '@ab/shared';
import { counted } from '@ab/core';
import type { SummaryRow } from '@/booking/trial/lib/confirm-summary';
import type { ViewerClock } from '@/core/lib/clock';
import { t, whenText } from '@ab/mobile-kit';

const durations: Record<string, string | undefined> = t.enums.duration;

/** The review row already names the package, so no prefix inside it. */
export function courseFixedText(sub: SalesCourseView['subscription']): string {
  if (!sub) return '';
  const size = sub.package
    ? t.enums.packageSize[sub.package]
    : counted(t.schedule.lessonCount, sub.lessons_total);
  return `${size} · ${durations[String(sub.duration)] ?? String(sub.duration)}`;
}

interface CourseRowsInput {
  view: SalesCourseView;
  teacherName: string;
  body: BookingRequest | null;
  /** The viewer's zone and cycle (useViewerTz, useClockCycle). */
  viewer: ViewerClock;
}

/** Review lines: student, teacher (no row while her name is unknown), plan, first lesson. */
export function courseRows({ view, teacherName, body, viewer }: CourseRowsInput): SummaryRow[] {
  const rows: SummaryRow[] = [
    [t.booking.studentSection, view.student.name],
    ...(teacherName ? [[t.booking.steps.teacher, teacherName] satisfies SummaryRow] : []),
    [t.booking.steps.package, courseFixedText(view.subscription)],
  ];
  if (body?.startsAt)
    rows.push([t.booking.startsOn, whenText(body.startsAt, view.student.tz, viewer)]);
  return rows;
}
