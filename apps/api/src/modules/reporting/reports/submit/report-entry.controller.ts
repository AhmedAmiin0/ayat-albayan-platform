import { teacherReportsQuerySchema, type PendingReportView, type ReportFormResponse, type StudentReportsResponse, type TeacherReportView } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { pageQuerySchema, parseOrThrow, type Page } from '../../../../common/http/http';
import { ReportHistoryService } from '../history/report-history.service';
import { ReportsService } from '../reports.service';
import { TeacherReportsService } from '../teacher/teacher-reports.service';

/**
 * Where reports are reached from (docs/11 §4 R1, R5, R11): the lesson, the student, the teacher's
 * dashboard and «التقارير» (teacher mode). The static `teachers/me/…` wins over `teachers/:id` in Fastify's router.
 */
@ApiTags('reports')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller()
export class ReportEntryController {
  constructor(
    private readonly reports: ReportsService,
    private readonly history: ReportHistoryService,
    private readonly mineService: TeacherReportsService,
  ) {}

  /** R1 (R-REP-01): identity read-only, one draft per student created on first open. */
  @Get('lessons/:id/report-form')
  @Permissions('reports.read')
  form(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ReportFormResponse> {
    return this.reports.form(id, user);
  }

  /** R5 (R-REP-05): submitted reports newest first + the grade series. */
  @Get('students/:id/reports')
  @Permissions('reports.read')
  student(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentReportsResponse> {
    return this.history.student({ studentId: id, page: parseOrThrow(pageQuerySchema, query), user });
  }

  /** R11 (R-TCH-03): started lessons still missing a submitted report. */
  @Get('teachers/me/pending-reports')
  pending(@CurrentUser() user: AuthUser): Promise<PendingReportView[]> {
    return this.history.pending(user);
  }

  /** Teacher mode «تقارير اتبعتت» (R-REP-02): my submitted reports, newest first, with the edit window. */
  @Get('teachers/me/reports')
  mine(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<Page<TeacherReportView>> {
    return this.mineService.mine(user, { filter: parseOrThrow(teacherReportsQuerySchema, query), page: parseOrThrow(pageQuerySchema, query) });
  }
}
