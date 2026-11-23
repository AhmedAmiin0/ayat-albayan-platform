import { Module } from '@nestjs/common';
import { SalesChatModule } from './chat';
import { SalesPackageCancelModule } from './package-cancel';
import { SalesPaymentEditModule } from './payment-edit';
import { SalesMoneyReadsModule } from './reads';
import { SalesPaymentsController, SalesSubscribeController } from './sales-money.controller';
import { SalesMoney } from './sales-money.service';
import { SalesMoneySharedModule } from './shared';
import { SalesTeacherAssignModule } from './teacher';
import { UsedBeforeModule } from './used-before';

/**
 * The salesperson subscribes her student from the chat and records the family's bank transfer
 * (R-ASST-01/04, docs/16 rows 16–19), permission self.sales_money. Thin: the money logic is the
 * admin's (SubscriptionCreator, PaymentsService, ReceiptsService) and the ownership is
 * SalesOwnershipRule's. The one place the sales-money modules are wired: AppModule imports this.
 */
@Module({
  imports: [
    ...[SalesMoneySharedModule, SalesMoneyReadsModule, SalesChatModule],
    ...[SalesPackageCancelModule, SalesPaymentEditModule, SalesTeacherAssignModule],
    UsedBeforeModule,
  ],
  controllers: [SalesSubscribeController, SalesPaymentsController],
  providers: [SalesMoney],
})
export class SalesMoneyModule {}
