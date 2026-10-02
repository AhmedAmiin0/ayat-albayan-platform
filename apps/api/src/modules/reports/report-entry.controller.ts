import type { PendingReportView, ReportFormResponse, StudentReportsResponse } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQuerySchema, parseOrThrow } from '../teachers/http';
import { ReportHistoryService } from './report-history.service';
import { ReportsService } from './reports.service';

/**
 * Where reports are reached from (docs/11 §4 R1, R5, R11): the lesson, the student, the teacher's
 * dashboard. The static `teachers/me/…` wins over `teachers/:id` in Fastify's router.
 */
@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class ReportEntryController {
  constructor(
    private readonly reports: ReportsService,
    private readonly history: ReportHistoryService,
  ) {}

  /** R1 (R-REP-01): identity read-only, one draft per student created on first open. */
  @Get('lessons/:id/report-form')
  @Roles('admin', 'teacher')
  form(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ReportFormResponse> {
    return this.reports.form(id, user);
  }

  /** R5 (R-REP-05): submitted reports newest first + the grade series. */
  @Get('students/:id/reports')
  @Roles('admin', 'teacher')
  student(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentReportsResponse> {
    return this.history.student({ studentId: id, page: parseOrThrow(pageQuerySchema, query), user });
  }

  /** R11 (R-TCH-03): started lessons still missing a submitted report. */
  @Get('teachers/me/pending-reports')
  @Roles('teacher')
  pending(@CurrentUser() user: AuthUser): Promise<PendingReportView[]> {
    return this.history.pending(user);
  }
}
