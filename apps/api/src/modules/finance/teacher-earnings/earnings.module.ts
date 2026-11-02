import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { TeacherMyEarningsController } from './earnings.mine.controller';
import { TeacherEarningsController } from './earnings.controller';
import { CorrectionsRepo } from './summary/corrections.repo';
import { EarningsRepo } from './earnings.repo';
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
  providers: [CorrectionsRepo, EarningsRepo, EarningsReceipts, EarningsService],
  exports: [CorrectionsRepo, EarningsRepo, EarningsReceipts],
})
export class TeacherEarningsModule {}
