import { Module } from '@nestjs/common';
import { ReceivablesModule } from '../../finance/receivables/receivables.module';
import { ExportsController } from './exports.controller';
import { ExportsQueries } from './exports.queries';
import { ExportsService } from './exports.service';
import { FinanceExportsController } from './finance-exports.controller';
import { FinanceExportsQueries } from './finance-exports.queries';

/**
 * CSV exports: students, lessons, payments, payouts (R-RPT-03, R-TCH-04), and the finance files
 * (expenses, teacher ledger, receivables; owner 2026-10-05).
 * Owner: Phase 3 builder B4 (docs/11-phase3-contracts.md §1).
 */
@Module({
  imports: [ReceivablesModule],
  controllers: [ExportsController, FinanceExportsController],
  providers: [ExportsService, ExportsQueries, FinanceExportsQueries],
})
export class ExportsModule {}
