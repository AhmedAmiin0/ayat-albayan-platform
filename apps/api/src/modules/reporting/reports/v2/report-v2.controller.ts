import { reportRoutes as routes, type ReportView } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ReportV2Service } from './report-v2.service';

/**
 * The new report form's writes (report_form_v2). Reads stay on GET /reports/:id and
 * GET /lessons/:id/report-form, which carry form_version, content and the memorization history.
 * A teacher writes only their own lesson's report (ReportGate).
 */
@ApiBearerAuth()
@Controller()
export class ReportV2Controller {
  constructor(private readonly reports: ReportV2Service) {}

  @Route(routes.draftV2)
  draft(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.draftV2>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    return this.reports.draft({ id: params.id, form: body, user });
  }

  @Route(routes.submitV2)
  @HttpCode(200)
  submit(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.submitV2>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    return this.reports.submit({ id: params.id, form: body, user });
  }
}
