import { reportPageRoutes as routes, type ReportPageView } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, SignedIn } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ReportPageService } from './report-page.service';

/**
 * The report's live page for a signed-in reader: any role may ask, the service
 * answers only the report's readers (ReportReaders: admin, the lesson's teacher, the family, the
 * student's owning assistant, read-only); anyone else gets the same 404 as an unknown report.
 */
@ApiBearerAuth()
@SignedIn()
@Controller()
export class ReportPageController {
  constructor(private readonly pages: ReportPageService) {}

  /** The link's page: /report/<public_id>. */
  @Route(routes.byPublicId)
  byPublicId(
    @RouteInput() { params }: RouteInputOf<typeof routes.byPublicId>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportPageView> {
    return this.pages.signedIn({ by: 'public', value: params.publicId }, user);
  }

  /** The apps hold the report's uuid. */
  @Route(routes.byReportId)
  byReportId(
    @RouteInput() { params }: RouteInputOf<typeof routes.byReportId>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportPageView> {
    return this.pages.signedIn({ by: 'id', value: params.id }, user);
  }
}
