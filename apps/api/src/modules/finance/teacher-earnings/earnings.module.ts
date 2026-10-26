import { Module } from '@nestjs/common';
import { TeachersModule } from '../../people/teachers/teachers.module';
import { TeacherMyEarningsController } from './earnings.mine.controller';
import { TeacherEarningsController } from './earnings.controller';
import { CorrectionsQueries } from './summary/corrections.queries';
import { EarningsQueries } from './earnings.queries';
import { EarningsReceipts } from './earnings.receipts';
import { EarningsService } from './earnings.service';

/**
 * Per-session teacher earnings and payments (docs/11 §10): admin balance / sessions / pay /
 * receipt, a teacher's own read-only view. Exports the queries for the monthly payout, which
 * settles this ledger when it is marked paid.
 */
@Module({
  imports: [TeachersModule],
  controllers: [TeacherEarningsController, TeacherMyEarningsController],
  providers: [CorrectionsQueries, EarningsQueries, EarningsReceipts, EarningsService],
  exports: [CorrectionsQueries, EarningsQueries, EarningsReceipts],
})
export class TeacherEarningsModule {}
