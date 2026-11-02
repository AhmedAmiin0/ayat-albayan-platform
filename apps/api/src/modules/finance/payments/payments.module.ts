import { Module } from '@nestjs/common';
import { FxModule } from '@/modules/finance/fx/fx.module';
import { InvoicesModule } from '@/modules/finance/invoices/invoices.module';
import { SubscriptionsModule } from '@/modules/finance/subscriptions/subscriptions.module';
import { PaymentAttachmentsRepo } from './attachments/payment-attachments.repo';
import { PaymentAttachments } from './attachments/payment-attachments.service';
import { PaymentFiles } from './attachments/payment-files';
import { PaymentInputs } from './payment-inputs';
import { PaymentsController } from './payments.controller';
import { PaymentsRepo } from './payments.repo';
import { PaymentsService } from './payments.service';
import { PaymentsSettings } from './payments.settings';
import { ReceiptsService } from './attachments/receipts.service';

/**
 * Payments CRUD + receipt upload URL + «المرفقات» (payment_attachments); subscription status recomputed after a payment.
 * R-PAY-01, R-MOB-02 (camera receipt). Routes P1–P7 (docs/11 §7).
 */
@Module({
  imports: [SubscriptionsModule, FxModule, InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentInputs, PaymentsRepo, PaymentsService, PaymentsSettings, ReceiptsService, PaymentFiles, PaymentAttachments, PaymentAttachmentsRepo],
  // The salesperson's bank transfer from the chat reuses them (sales-money); her own files (/sales/me, assistant-pay);
  // the Stripe module's webhook reads a session's own payment (PaymentsQueries.byRequest).
  exports: [PaymentsService, ReceiptsService, PaymentAttachments, PaymentsRepo],
})
export class PaymentsModule {}
