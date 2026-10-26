import { Module } from '@nestjs/common';
import { ThreadMediaService } from '../inbox/files/thread-media.service';
import { PaymentsModule } from '../payments/payments.module';
import { SalesModule } from '../sales/sales.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SalesChatFiles } from './chat/sales-chat-files';
import { SalesChatReceipts } from './chat/sales-chat-receipts.service';
import { SalesFamilyQueries } from './reads/sales-family.queries';
import { SalesMoneyReadsController } from './reads/sales-money-reads.controller';
import { SalesPaymentsController, SalesSubscribeController } from './sales-money.controller';
import { SalesMoneyReads } from './reads/sales-money.reads';
import { SalesMoneyScope } from './sales-money.scope';
import { SalesMoney } from './sales-money.service';
import { SalesMoneyServices } from './sales-money.services';
import { SalesMoneySettings } from './sales-money.settings';

/**
 * The salesperson subscribes her student from the chat and records the family's bank transfer (owner
 * 2026-10-12, R-ASST-01/04, docs/16 rows 16–19), permission self.sales_money. Thin: the money logic is the
 * admin's (SubscriptionCreator, PaymentsService, ReceiptsService), the ownership is SalesQueries.ownership,
 * and the chat files are ThreadMediaService's (its deps are global: InboundMedia, StorageService).
 */
@Module({
  imports: [SubscriptionsModule, PaymentsModule, SalesModule],
  controllers: [SalesSubscribeController, SalesPaymentsController, SalesMoneyReadsController],
  providers: [
    ...[SalesMoney, SalesMoneyServices, SalesMoneyScope, SalesMoneyReads, SalesFamilyQueries],
    ...[SalesChatReceipts, SalesChatFiles, ThreadMediaService, SalesMoneySettings],
  ],
})
export class SalesMoneyModule {}
