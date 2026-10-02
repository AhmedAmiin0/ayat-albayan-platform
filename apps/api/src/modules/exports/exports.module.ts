import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsQueries } from './exports.queries';
import { ExportsService } from './exports.service';

/**
 * CSV exports: students, lessons, payments, payouts. R-RPT-03, R-TCH-04.
 * Owner: Phase 3 builder B4 (docs/11-phase3-contracts.md §1).
 */
@Module({
  controllers: [ExportsController],
  providers: [ExportsService, ExportsQueries],
})
export class ExportsModule {}
