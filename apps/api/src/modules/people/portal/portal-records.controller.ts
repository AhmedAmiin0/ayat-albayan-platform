import {
  portalRoutes as routes,
  type PortalFileUrl,
  type PortalPackageView,
  type PortalReports,
} from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput } from '@/common/http/route';
import { PortalPackageService } from './package/portal-package.service';
import { PortalReportsService } from './reports/portal-reports.service';
import type { Input } from './portal.types';

/** Same scope key and scoping as PortalController. */
@ApiBearerAuth()
@Controller()
export class PortalRecordsController {
  constructor(
    @Inject(PortalReportsService) private readonly reports: PortalReportsService,
    @Inject(PortalPackageService) private readonly packages: PortalPackageService,
  ) {}

  @Route(routes.reports)
  reportList(
    @RouteInput() { params }: Input<'reports'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalReports> {
    return this.reports.list({ user, studentId: params.id });
  }

  @Route(routes.reportUrl)
  @HttpCode(200)
  reportUrl(
    @RouteInput() { params }: Input<'reportUrl'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalFileUrl> {
    return this.reports.reportUrl({ user, studentId: params.id, id: params.reportId });
  }

  @Route(routes.recordingUrl)
  @HttpCode(200)
  recordingUrl(
    @RouteInput() { params }: Input<'recordingUrl'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalFileUrl> {
    return this.reports.recordingUrl({ user, studentId: params.id, id: params.recordingId });
  }

  @Route(routes.package)
  currentPackage(
    @RouteInput() { params }: Input<'package'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalPackageView> {
    return this.packages.current({ user, studentId: params.id });
  }
}
