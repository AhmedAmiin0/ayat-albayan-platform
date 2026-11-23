import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { SalesChatModule } from '@/modules/sales/sales-money/chat';
import { SalesMoneySharedModule } from '@/modules/sales/sales-money/shared';
import { SalesMoneyFamily } from './sales-money-family.service';
import { SalesMoneyReadsController } from './sales-money-reads.controller';
import { SalesMoneyReads } from './sales-money.reads';
import { SalesRenewals } from './sales-renewals';

/** GET /sales/money/*: the family's students with their packages owed, and the chat's receipts. */
@Module({
  imports: [SalesMoneySharedModule, SubscriptionsModule, SalesChatModule],
  controllers: [SalesMoneyReadsController],
  providers: [SalesMoneyReads, SalesRenewals, SalesMoneyFamily],
  exports: [SalesMoneyReads],
})
export class SalesMoneyReadsModule {}
