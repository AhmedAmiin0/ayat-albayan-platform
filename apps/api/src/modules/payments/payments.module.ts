import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentInputs } from './payment-inputs';
import { PaymentsController } from './payments.controller';
import { PaymentsQueries } from './payments.queries';
import { PaymentsService } from './payments.service';
import { ReceiptsService } from './receipts.service';

/**
 * Payments CRUD + receipt upload URL; subscription status recomputed after a payment.
 * R-PAY-01, R-MOB-02 (camera receipt). Routes P1–P7 (docs/11 §7).
 */
@Module({
  imports: [SubscriptionsModule, FxModule, InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentInputs, PaymentsQueries, PaymentsService, ReceiptsService],
})
export class PaymentsModule {}
