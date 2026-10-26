import { Module } from '@nestjs/common';
import { FxModule } from '../../finance/fx/fx.module';
import { DashboardController } from './dashboard.controller';
import { DashboardQueries } from './dashboard.queries';
import { DashboardService } from './dashboard.service';
import { DashboardSettings } from './dashboard.settings';
import { FinanceQueries } from './finance/finance.queries';
import { FinanceService } from './finance/finance.service';
import { FxConverter } from './finance/fx-converter';
import { WorkQueries } from './work/work.queries';

/**
 * Dashboard summary: funnel, lessons, pending reports, unpaid, teacher load, finance by month and
 * source (R-RPT-01/02), and the admin's work queue. Owner: Phase 3 builder B4 (docs/11 §1).
 */
@Module({
  imports: [FxModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardQueries, DashboardSettings, FinanceService, FinanceQueries, WorkQueries, FxConverter],
  exports: [FxConverter],
})
export class DashboardModule {}
