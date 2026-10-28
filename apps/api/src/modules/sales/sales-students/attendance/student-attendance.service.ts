import { attendanceMonthQuery, riyadhMonthOf, type StudentAttendanceTable } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../../../../common/http/errors';
import { attendanceWindow, toAttendanceTable } from './student-attendance.mapper';
import { StudentAttendanceQueries } from './student-attendance.queries';

/** `?month=YYYY-MM` or the current Riyadh month; 400 invalid_month otherwise. */
export function monthOf(query: unknown, now: Date): string {
  const parsed = attendanceMonthQuery.safeParse(query ?? {});
  if (!parsed.success) throw badRequest('invalid_month');
  return parsed.data.month ?? riyadhMonthOf(now);
}

/**
 * «سجل الحضور» of one student (owner 2026-10-28): every lesson that started in a Riyadh month, the
 * months that have one, and the month's totals. Read-only; the same rows for sales and the admin.
 */
@Injectable()
export class StudentAttendanceService {
  constructor(private readonly queries: StudentAttendanceQueries) {}

  /** 404 student_not_found for an unknown id. */
  async table(studentId: string, o: { month: string; mine: boolean }, now = new Date()): Promise<StudentAttendanceTable> {
    if (!(await this.queries.exists(studentId))) throw notFound('student_not_found');
    const [lessons, starts] = await Promise.all([
      this.queries.lessons(studentId, attendanceWindow(o.month, now)),
      this.queries.starts(studentId, now),
    ]);
    const reports = await this.queries.reports(studentId, lessons.map((l) => l.id));
    return toAttendanceTable({ month: o.month, lessons, reports, starts, mine: o.mine }, now);
  }
}
