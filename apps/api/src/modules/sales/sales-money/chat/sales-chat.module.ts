import { Module } from '@nestjs/common';
import { ThreadMediaService } from '@/modules/messaging/inbox';
import { SalesMoneySharedModule } from '@/modules/sales/sales-money/shared';
import { SalesChatFiles } from './sales-chat-files';
import { SalesChatReceipts } from './sales-chat-receipts.service';

/**
 * The family chat's photos and PDFs as receipts (docs/16 row 18). ThreadMediaService is this
 * module's own instance of the inbox pickers' service: its deps (InboundMedia, StorageService)
 * are global, so the inbox module is not imported.
 */
@Module({
  imports: [SalesMoneySharedModule],
  providers: [SalesChatReceipts, SalesChatFiles, ThreadMediaService],
  exports: [SalesChatReceipts],
})
export class SalesChatModule {}
