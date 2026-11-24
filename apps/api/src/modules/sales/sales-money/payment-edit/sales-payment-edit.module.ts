import { Module } from '@nestjs/common';
import { SalesMoneyReadsModule } from '@/modules/sales/sales-money/reads';
import { SalesMoneySharedModule } from '@/modules/sales/sales-money/shared';
import { SalesPaymentAmount } from './sales-payment-amount';

/** Transfer amount edit, served by SalesPaymentsController (PATCH :id/amount). */
@Module({
  imports: [SalesMoneySharedModule, SalesMoneyReadsModule],
  providers: [SalesPaymentAmount],
  exports: [SalesPaymentAmount],
})
export class SalesPaymentEditModule {}
