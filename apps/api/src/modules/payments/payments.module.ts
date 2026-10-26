import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentAttachmentsQueries } from './attachments/payment-attachments.queries';
import { PaymentAttachments } from './attachments/payment-attachments.service';
import { PaymentFiles } from './attachments/payment-files';
import { PaymentInputs } from './payment-inputs';
import { PaymentsController } from './payments.controller';
import { PaymentsQueries } from './payments.queries';
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
  providers: [PaymentInputs, PaymentsQueries, PaymentsService, PaymentsSettings, ReceiptsService, PaymentFiles, PaymentAttachments, PaymentAttachmentsQueries],
  // The salesperson's bank transfer from the chat reuses them (sales-money); her own files (/sales/me, assistant-pay).
  exports: [PaymentsService, ReceiptsService, PaymentAttachments],
})
export class PaymentsModule {}
