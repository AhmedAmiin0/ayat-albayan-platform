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
import { ThreadFileController } from './thread-file.controller';
import { ThreadFileSendController } from './thread-file-send.controller';
import { ThreadFileSender } from './thread-file-send.service';
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
 * brings TeacherMeQueries for «my students». Sales mode: SalesModule brings SalesScopes; SalesThreadsService serves a salesperson every chat, redacted (docs/16).
 * ThreadFileController serves bubble photos / PDFs to the admin and sales (docs/20 W6);
 * ThreadFileSendController lets them send images / PDFs from the chat (owner 2026-10-19 #2).
 */
@Module({
  imports: [SubscriptionsModule, LessonsModule, SalesModule],
  controllers: [ThreadsController, ThreadMediaController, ThreadFileController, ThreadFileSendController],
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
    ThreadFileSender,
  ],
  // The feedback module sends «ابعت طلب الرأي» through the same send-now path; meeting invitations
  // (ClassroomModule) read the thread and queue their chat text (R-MEET-02), a teacher only to the
  // families TeacherScopes lets them write to.
  exports: [Outbox, ThreadsQueries, TeacherScopes],
})
export class InboxModule {}
