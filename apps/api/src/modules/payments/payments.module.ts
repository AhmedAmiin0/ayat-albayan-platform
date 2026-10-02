import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsQueries } from './payments.queries';
import { PaymentsService } from './payments.service';
import { ReceiptsService } from './receipts.service';

/**
 * Payments CRUD + receipt upload URL; subscription status recomputed after a payment.
 * R-PAY-01, R-MOB-02 (camera receipt). Routes P1–P7 (docs/11 §7).
 */
@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsQueries, PaymentsService, ReceiptsService],
})
export class PaymentsModule {}
