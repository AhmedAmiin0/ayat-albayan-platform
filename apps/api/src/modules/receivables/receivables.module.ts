import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesQueries } from './receivables.queries';
import { ReceivablesService } from './receivables.service';

/** Receivables (owner, 2026-10-05): packages that still owe, aging, totals; exported for the CSV. */
@Module({
  imports: [DashboardModule],
  controllers: [ReceivablesController],
  providers: [ReceivablesQueries, ReceivablesService],
  exports: [ReceivablesService],
})
export class ReceivablesModule {}
