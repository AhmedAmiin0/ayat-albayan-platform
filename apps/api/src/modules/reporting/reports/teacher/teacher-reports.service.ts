import type { TeacherReportView, TeacherReportsQuery } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import type { Page, PageQuery } from '../../../../common/http/http';
import { ReportGate } from '../submit/report-gate';
import { ReportHistoryQueries } from '../history/report-history.queries';
import { toTeacherReportView } from './teacher-reports.mapper';
import { TeacherReportsQueries } from './teacher-reports.queries';

/**
 * GET /teachers/me/reports (teacher mode «التقارير», R-REP-02, R-TCH-03): my submitted reports,
 * newest first unless sorted, filterable (R-NFR-08), with the edit window. Drafts and missing reports stay in pending-reports.
 */
@Injectable()
export class TeacherReportsService {
  constructor(
    private readonly queries: TeacherReportsQueries,
    private readonly history: ReportHistoryQueries,
    private readonly gate: ReportGate,
  ) {}

  async mine(user: AuthUser, input: { filter: TeacherReportsQuery; page: PageQuery }): Promise<Page<TeacherReportView>> {
    const { filter, page } = input;
    const teacherId = await this.gate.access.teacherId(user);
    const [{ rows, total }, ctx] = await Promise.all([this.queries.page({ teacherId, filter, page }), this.gate.context(user)]);
    const [lessons, students] = await Promise.all([
      this.history.lessons(rows.map((r) => r.lesson_id)),
      this.queries.students(rows.map((r) => r.student_id)),
    ]);
    const parts = {
      lessons: new Map(lessons.map((l) => [l.id, l.starts_at])),
      students: new Map(students.map((s) => [s.id, s])),
      now: ctx.now,
      hours: ctx.hours,
    };
    return { items: rows.map((r) => toTeacherReportView(r, parts)), total, page: page.page, pageSize: page.pageSize };
  }
}
