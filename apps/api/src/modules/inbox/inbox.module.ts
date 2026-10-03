import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { SalesModule } from '../sales/sales.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Outbox } from './outbox';
import { ReadReceipts } from './read-receipts';
import { SalesThreadsService } from './sales-threads.service';
import { TeacherScopes } from './teacher-scope';
import { TeacherThreadsQueries } from './teacher-threads.queries';
import { TeacherThreadsService } from './teacher-threads.service';
import { ThreadMediaController } from './thread-media.controller';
import { ThreadMediaService } from './thread-media.service';
import { ThreadReads } from './thread-reads';
import { ThreadSendService } from './thread-send.service';
import { ThreadsController } from './threads.controller';
import { ThreadsQueries } from './threads.queries';
import { ThreadsService } from './threads.service';

/**
 * The WhatsApp inbox routes H1–H4 (docs/12 §4). The webhook lives in WebhookModule and the lead
 * qualification / follow-up routes (L1–L2) in LeadsModule; WhatsappModule (global) brings the
 * client, the send gate, the sender, the registry and MessageViews. SubscriptionsModule brings the
 * package balances behind a thread's `people` and «مشترك» tag (R-SUB-01). Teacher mode (R-TCH-03):
 * ThreadReads picks the admin's or the teacher's reads per request (TeacherScopes); LessonsModule
 * brings TeacherMeQueries for «my students». Sales mode: SalesModule brings SalesScopes; SalesThreadsService serves a salesperson's own leads' chats.
 */
@Module({
  imports: [SubscriptionsModule, LessonsModule, SalesModule],
  controllers: [ThreadsController, ThreadMediaController],
  providers: [
    ThreadsQueries,
    ThreadsService,
    ThreadSendService,
    ReadReceipts,
    Outbox,
    TeacherThreadsQueries,
    TeacherScopes,
    TeacherThreadsService,
    SalesThreadsService,
    ThreadReads,
    ThreadMediaService,
  ],
  // The feedback module sends «ابعت طلب الرأي» through the same send-now path.
  exports: [Outbox],
})
export class InboxModule {}
