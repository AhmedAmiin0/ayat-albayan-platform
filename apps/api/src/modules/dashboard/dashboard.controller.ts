import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/auth/decorators';
import { DashboardService } from './dashboard.service';
import { parseRange } from './range';

/** The /admin home (R-RPT-01, R-RPT-02). Admin only: it reads every teacher's and family's numbers. */
@ApiTags('dashboard')
@ApiBearerAuth()
@Permissions('dashboard.read')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** D1 `?from&to` (Riyadh days, inclusive, ≤ a year): counts from statuses, money in the reporting currency. */
  @Get('summary')
  summary(@Query() query: unknown) {
    return this.dashboard.summary(parseRange(query));
  }

  /** The admin's queue behind the KPI strip: pending reports, unpaid packages, open tasks. */
  @Get('work')
  work() {
    return this.dashboard.queue();
  }
}
