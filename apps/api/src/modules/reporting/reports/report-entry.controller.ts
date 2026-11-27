import {
  reportHistoryRoutes as routes,
  type PendingReportView,
  type ReportFormResponse,
  type StudentReportsResponse,
  type TeacherReportView,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ReportHistoryService } from '@/modules/reporting/reports/history/report-history.service';
import { ReportsService } from '@/modules/reporting/reports/shared/reports.service';
import { TeacherReportsService } from '@/modules/reporting/reports/teacher/teacher-reports.service';
import type { Page } from '@ab/core';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** docs/11 §4 R1, R5, R11. */
@ApiBearerAuth()
@Controller()
export class ReportEntryController {
  constructor(
    private readonly reports: ReportsService,
    private readonly history: ReportHistoryService,
    private readonly mineService: TeacherReportsService,
  ) {}

  /** R1 (R-REP-01): identity read-only, one draft per student created on first open. */
  @Get('lessons/:id/report-form')
  @ApiTags('reports')
  @Permissions('reports.read')
  form(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportFormResponse> {
    return this.reports.form(id, user);
  }

  /** R5 (R-REP-05): submitted reports newest first + the grade series. */
  @Route(routes.student)
  student(
    @RouteInput() { params, query }: Input<'student'>,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentReportsResponse> {
    return this.history.student({ studentId: params.id, page: query, user });
  }

  /** R11 (R-TCH-03). */
  @Route(routes.pending)
  pending(@CurrentUser() user: AuthUser): Promise<PendingReportView[]> {
    return this.history.pending(user);
  }

  /** R-REP-02: newest first, with the edit window. */
  @Route(routes.mine)
  mine(
    @RouteInput() { query }: Input<'mine'>,
    @CurrentUser() user: AuthUser,
  ): Promise<Page<TeacherReportView>> {
    const { page, pageSize, ...filter } = query;
    return this.mineService.mine(user, { filter, page: { page, pageSize } });
  }
}
