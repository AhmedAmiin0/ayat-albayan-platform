import { Module } from '@nestjs/common';
import { DashboardModule } from '@/modules/reporting/dashboard/dashboard.module';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesRepo } from './receivables.repo';
import { ReceivablesService } from './receivables.service';
import { ReceivablesSettings } from './receivables.settings';

/** Receivables (owner, 2026-10-05): packages that still owe, aging, totals; exported for the CSV. */
@Module({
  imports: [DashboardModule],
  controllers: [ReceivablesController],
  providers: [ReceivablesRepo, ReceivablesSettings, ReceivablesService],
  exports: [ReceivablesService],
})
export class ReceivablesModule {}
