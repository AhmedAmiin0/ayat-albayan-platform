import { counted, type BookingRequest, type SalesCourseView } from '@ab/shared';
import type { SummaryRow } from '@/booking/confirm-summary';
import { whenText } from '@/booking/slots';
import { t } from '@/lib/i18n';

const durations: Record<string, string | undefined> = t.enums.duration;

/**
 * «8 حلقات · 45 دقيقة»: the plan's size (a custom count's lessons) and length, the value of the
 * review's «الباقة» row (the row already says it is the package; no prefix inside it).
 */
export function courseFixedText(sub: SalesCourseView['subscription']): string {
  if (!sub) return '';
  const size = sub.package ? t.enums.packageSize[sub.package] : counted(t.schedule.lessonCount, sub.lessons_total);
  return `${size} · ${durations[String(sub.duration)] ?? String(sub.duration)}`;
}

export interface CourseRowsInput {
  view: SalesCourseView;
  teacherName: string;
  body: BookingRequest | null;
}

/** The review's lines: the student, the teacher, the plan (from the subscription), the first lesson. */
export function courseRows({ view, teacherName, body }: CourseRowsInput): SummaryRow[] {
  const rows: SummaryRow[] = [
    [t.booking.studentSection, view.student.name],
    [t.booking.steps.teacher, teacherName],
    [t.booking.steps.package, courseFixedText(view.subscription)],
  ];
  if (body?.startsAt) rows.push([t.booking.startsOn, whenText(body.startsAt, view.student.tz)]);
  return rows;
}
