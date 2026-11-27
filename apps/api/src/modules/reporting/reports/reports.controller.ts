import { reportRoutes as routes, type ReportView, type SignedDownload } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ReportFilesService } from './files/report-files.service';
import { ReportSubmitService } from './submit/report-submit.service';
import { ReportsService } from './shared/reports.service';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * One report (docs/11 §4 R2, R3, R4, R6, R12): read, autosave, submit / edit, the PDF.
 * A teacher touches only their own reports (ReportAccess → 403).
 */
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly submits: ReportSubmitService,
    private readonly files: ReportFilesService,
  ) {}

  @Route(routes.get)
  get(@RouteInput() { params }: Input<'get'>, @CurrentUser() user: AuthUser): Promise<ReportView> {
    return this.reports.get(params.id, user);
  }

  @Route(routes.draft)
  draft(
    @RouteInput() { params, body }: Input<'draft'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    return this.reports.draft({ id: params.id, form: body, user });
  }

  @Route(routes.submit)
  @HttpCode(200)
  submit(
    @RouteInput() { params, body }: Input<'submit'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    return this.submits.submit({ id: params.id, form: body, user });
  }

  @Route(routes.pdf)
  pdf(
    @RouteInput() { params }: Input<'pdf'>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedDownload> {
    return this.files.pdfUrl({ id: params.id, user });
  }

  @Route(routes.retryPdf)
  @HttpCode(200)
  retry(
    @RouteInput() { params }: Input<'retryPdf'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportView> {
    return this.submits.retryPdf({ id: params.id, user });
  }
}
