import { Module } from '@nestjs/common';
import { TeacherEarningsModule } from '../teacher-earnings/earnings.module';
import { TeachersModule } from '../teachers/teachers.module';
import { PayoutPaymentController, PayoutsController, TeacherPayoutsController } from './payouts.controller';
import { PayoutsGenerator } from './payouts.generate';
import { PayoutsLedger } from './payouts.ledger';
import { PayoutsPayment } from './payouts.payment';
import { PayoutsQueries } from './payouts.queries';
import { PayoutsService } from './payouts.service';
import { PayoutsSettings } from './payouts.settings';

/**
 * Teacher payouts: generate a month, approve, pay; a teacher reads own. R-PAY-02, R-TCH-04.
 * Routes Y1–Y5 (docs/11 §8). Marking a payout paid settles the per-session ledger (docs/11 §10). PayoutsQueries is exported for the CSV export (B4).
 */
@Module({
  imports: [TeachersModule, TeacherEarningsModule],
  controllers: [PayoutsController, PayoutPaymentController, TeacherPayoutsController],
  providers: [PayoutsSettings, PayoutsGenerator, PayoutsLedger, PayoutsPayment, PayoutsQueries, PayoutsService],
  exports: [PayoutsQueries, PayoutsService],
})
export class PayoutsModule {}
