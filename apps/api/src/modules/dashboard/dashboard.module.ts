import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module';
import { DashboardController } from './dashboard.controller';
import { DashboardQueries } from './dashboard.queries';
import { DashboardService } from './dashboard.service';
import { FinanceQueries } from './finance.queries';
import { FinanceService } from './finance.service';
import { FxConverter } from './fx-converter';
import { WorkQueries } from './work.queries';

/**
 * Dashboard summary: funnel, lessons, pending reports, unpaid, teacher load, finance by month and
 * source (R-RPT-01/02), and the admin's work queue. Owner: Phase 3 builder B4 (docs/11 §1).
 */
@Module({
  imports: [FxModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardQueries, FinanceService, FinanceQueries, WorkQueries, FxConverter],
})
export class DashboardModule {}
