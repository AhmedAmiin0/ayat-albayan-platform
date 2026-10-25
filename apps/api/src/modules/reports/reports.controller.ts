import {
  reportDraftSchema,
  reportSubmitSchema,
  type ReportView,
  type SignedDownload,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow, sentOnly } from '../../common/http/http';
import { ReportFilesService } from './files/report-files.service';
import { ReportSubmitService } from './submit/report-submit.service';
import { ReportsService } from './reports.service';

/**
 * One report (docs/11 §4 R2, R3, R4, R6, R12): read, autosave, submit / edit, the PDF.
 * A teacher touches only their own reports (ReportAccess → 403).
 */
@ApiTags('reports')
@ApiBearerAuth()
@Permissions('reports.read')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly submits: ReportSubmitService,
    private readonly files: ReportFilesService,
  ) {}

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ReportView> {
    return this.reports.get(id, user);
  }

  /** R2 autosave: only the fields sent are written; 409 already_submitted after a submit. */
  @Put(':id/draft')
  @Permissions('reports.write')
  draft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    const form = sentOnly(parseOrThrow(reportDraftSchema, body), body);
    return this.reports.draft({ id, form, user });
  }

  /** R3: 400 validation_failed (missing_attendance / missing_grades), 409 version / window / lesson. */
  @Post(':id/submit')
  @HttpCode(200)
  @Permissions('reports.write')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    return this.submits.submit({ id, form: parseOrThrow(reportSubmitSchema, body), user });
  }

  /** R6: 1 h signed URL; 409 pdf_not_ready. */
  @Get(':id/pdf')
  pdf(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<SignedDownload> {
    return this.files.pdfUrl({ id, user });
  }

  /** R12: failed → pending; 409 pdf_not_failed. */
  @Post(':id/pdf/retry')
  @HttpCode(200)
  @Permissions('reports.resend')
  retry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ReportView> {
    return this.submits.retryPdf({ id, user });
  }
}
