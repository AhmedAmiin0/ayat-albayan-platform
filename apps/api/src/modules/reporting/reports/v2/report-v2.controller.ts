import { reportV2DraftSchema, reportV2SubmitSchema, type ReportView } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow, sentOnly } from '../../../../common/http/http';
import { ReportV2Service } from './report-v2.service';

/**
 * The new report form's writes (report_form_v2). Reads stay on GET /reports/:id and
 * GET /lessons/:id/report-form, which carry form_version, content and the memorization history.
 * Same permissions as the v1 writes; a teacher writes only their own lesson's report (ReportGate).
 */
@ApiTags('reports')
@ApiBearerAuth()
@Permissions('reports.write')
@Controller('reports/:id/v2')
export class ReportV2Controller {
  constructor(private readonly reports: ReportV2Service) {}

  /** Autosave: only the fields sent are written; 409 already_submitted / form_version_mismatch. */
  @Put('draft')
  draft(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ReportView> {
    const form = sentOnly(parseOrThrow(reportV2DraftSchema, body), body);
    return this.reports.draft({ id, form, user });
  }

  /** 400 validation_failed (missing_attendance / segments / topic / domain / grades), 409 as v1. */
  @Post('submit')
  @HttpCode(200)
  submit(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ReportView> {
    return this.reports.submit({ id, form: parseOrThrow(reportV2SubmitSchema, body), user });
  }
}
