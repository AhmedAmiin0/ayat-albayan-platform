import type { PendingReportView, StudentReportsResponse } from '@ab/shared';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { PageQuery } from '@/common/http/http';
import { ReportAccess } from '@/modules/reporting/reports/report-access';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { historyResponse, pendingViews } from './report-history.mapper';
import { ReportHistoryQueries } from './report-history.queries';

type HistoryInput = { studentId: string; page: PageQuery; user: AuthUser };

/** A student's report history + grade series (R5) and a teacher's missing reports (R11). */
@Injectable()
export class ReportHistoryService {
  constructor(
    private readonly queries: ReportHistoryQueries,
    private readonly access: ReportAccess,
    private readonly settings: ReportsSettings,
  ) {}

  /** R5 (R-REP-05, issue D2): admin; a teacher for their own student (assigned or taught). */
  async student({ studentId, page, user }: HistoryInput): Promise<StudentReportsResponse> {
    const student = await this.queries.student(studentId);
    if (!student) throw new NotFoundException();
    if (user.role !== 'admin') {
      const teacherId = await this.access.teacherId(user);
      const own = student.teacher_id === teacherId || (await this.queries.taught({ teacherId, studentId }));
      if (!own) throw new ForbiddenException();
    }
    const rows = await this.queries.submitted(studentId);
    const [lessons, seq, settings] = await Promise.all([
      this.queries.lessons(rows.map((r) => r.lesson_id)),
      this.queries.sequence(studentId),
      this.settings.read(),
    ]);
    const reader = { role: user.role, now: new Date(), minutes: settings.report_teacher_edit_minutes };
    return historyResponse({ rows, lessons, seq, page, window: reader });
  }

  /** R11 (R-TCH-03): «تقارير لسه ما اتكتبتش», oldest first. */
  async pending(user: AuthUser): Promise<PendingReportView[]> {
    const teacherId = await this.access.teacherId(user);
    return pendingViews(await this.queries.pending(teacherId, new Date()));
  }
}
