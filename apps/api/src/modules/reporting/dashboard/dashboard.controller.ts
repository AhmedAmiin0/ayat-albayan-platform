import { dashboardRoutes as routes, type DashboardResponse, type DashboardWork } from '@ab/money';
import { Controller, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';
import { DashboardService } from './dashboard.service';
import { parseRange } from './range';

/** The /admin home (R-RPT-01, R-RPT-02). Admin only: it reads every teacher's and family's numbers. */
@ApiTags('dashboard')
@ApiBearerAuth()
@Permissions('dashboard.read')
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  // parseRange keeps the range's own 400 codes (invalid_range, range_too_large), which
  // @RouteInput() would answer as validation_failed.
  @Route(routes.summary)
  summary(@Query() query: unknown): Promise<DashboardResponse> {
    return this.dashboard.summary(parseRange(query));
  }

  /** The admin's queue behind the KPI strip: pending reports, unpaid packages, open tasks. */
  @Route(routes.work)
  work(): Promise<DashboardWork> {
    return this.dashboard.queue();
  }
}
