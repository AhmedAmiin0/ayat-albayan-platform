import type { BookingRequest, SalesCourseView } from '@ab/shared';
import type { SummaryRow } from '@/booking/confirm-summary';
import { whenText } from '@/booking/slots';
import { t } from '@/lib/i18n';

/** «الباقة ومدة الحلقة من الاشتراك: 8 حلقات · 45 دقيقة». */
export function courseFixedText(view: SalesCourseView, pkg: BookingRequest['package']): string {
  const size = pkg ? t.enums.packageSize[pkg] : '';
  return t.booking.courseFixed.replace('{package}', size).replace('{minutes}', String(view.subscription?.duration ?? ''));
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
    [t.booking.steps.package, courseFixedText(view, body?.package)],
  ];
  if (body?.startsAt) rows.push([t.booking.startsOn, whenText(body.startsAt, view.student.tz)]);
  return rows;
}
