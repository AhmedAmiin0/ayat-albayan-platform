import { Module } from '@nestjs/common';
import { Outbox } from './outbox';
import { ReadReceipts } from './read-receipts';
import { ThreadSendService } from './thread-send.service';
import { ThreadsController } from './threads.controller';
import { ThreadsQueries } from './threads.queries';
import { ThreadsService } from './threads.service';

/**
 * The WhatsApp inbox routes H1–H4 (docs/12 §4). The webhook lives in WebhookModule and the lead
 * qualification / follow-up routes (L1–L2) in LeadsModule; WhatsappModule (global) brings the
 * client, the send gate, the sender, the registry and MessageViews.
 */
@Module({
  controllers: [ThreadsController],
  providers: [ThreadsQueries, ThreadsService, ThreadSendService, ReadReceipts, Outbox],
})
export class InboxModule {}
