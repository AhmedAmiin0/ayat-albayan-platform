import { Module } from '@nestjs/common';
import { ChatListsModule } from '../chat-lists/chat-lists.module';
import { LessonsModule } from '../../teaching/lessons/lessons.module';
import { SalesModule } from '../../sales/sales/sales.module';
import { SubscriptionsModule } from '../../finance/subscriptions/subscriptions.module';
import { InboxSettings } from './inbox.settings';
import { Outbox } from './send/outbox';
import { ReadReceipts } from './reads/read-receipts';
import { SalesThreadsService } from './sales-threads/sales-threads.service';
import { TeacherScopes } from './teacher-threads/teacher-scope';
import { TeacherThreadsQueries } from './teacher-threads/teacher-threads.queries';
import { TeacherThreadsService } from './teacher-threads/teacher-threads.service';
import { ThreadFileController } from './files/thread-file.controller';
import { ThreadFileSendController } from './files/thread-file-send.controller';
import { ThreadFileSender } from './files/thread-file-send.service';
import { ThreadMediaController } from './files/thread-media.controller';
import { ThreadMediaService } from './files/thread-media.service';
import { PdfPreviewQueries } from './files/pdf/pdf-preview.queries';
import { PdfPreviewService } from './files/pdf/pdf-preview.service';
import { ThreadReads } from './reads/thread-reads';
import { ForwardFiles } from './files/forward-files';
import { ThreadForwardController } from './files/thread-forward.controller';
import { ThreadForwardService } from './files/thread-forward.service';
import { ThreadQuotes } from './threads/thread-quotes';
import { ThreadSendService } from './send/thread-send.service';
import { ThreadsController } from './threads/threads.controller';
import { ThreadsQueries } from './threads/threads.queries';
import { ThreadsService } from './threads/threads.service';
import { KapsoReopener } from './reopen/kapso-reopener';
import { ReopenQueries } from './reopen/reopen.queries';
import { ReopenTemplate } from './reopen/reopen-template';
import { ReopenSettings } from './reopen/reopen.settings';
import { ThreadReopenController } from './reopen/thread-reopen.controller';
import { ThreadReopenService } from './reopen/thread-reopen.service';
import { ReactionQueries } from './reactions/reaction.queries';
import { ThreadReactionController } from './reactions/thread-reaction.controller';
import { ThreadReactionService } from './reactions/thread-reaction.service';
import { DeltaQueries } from './delta/delta.queries';
import { ThreadDeltaService } from './delta/thread-delta.service';
import { MessageHideController, MessageHideRepo, MessageHideService } from './hide';

/**
 * The WhatsApp inbox routes H1–H4 (docs/12 §4). The webhook lives in WebhookModule and the lead
 * qualification / follow-up routes (L1–L2) in LeadsModule; WhatsappModule (global) brings the
 * client, the send gate, the sender, the registry and MessageViews. SubscriptionsModule brings the
 * package balances behind a thread's `people` and «مشترك» tag (R-SUB-01). Teacher mode (R-TCH-03):
 * ThreadReads picks the admin's or the teacher's reads per request (TeacherScopes); LessonsModule
 * brings TeacherMeQueries for «my students». Sales mode: SalesModule brings SalesScopes; SalesThreadsService serves a salesperson every chat, redacted (docs/16).
 * ThreadFileController serves bubble photos / PDFs to the admin and sales (docs/20 W6);
 * ThreadFileSendController lets them send images / PDFs from the chat (owner 2026-10-19 #2).
 * PDF preview like WhatsApp (owner 2026-10-29): PdfPreviewService renders a bubble PDF's pages (poppler).
 * ChatListsModule: GET /threads?list= and the open chat's «القوائم» (docs/22).
 * «رد» / «إعادة توجيه» (owner 2026-10-25): ThreadQuotes, ThreadForwardController.
 * «إعادة فتح المحادثة» (owner 2026-10-26): ThreadReopenController (Kapso's record + the reopen template).
 * «تفاعل» (owner 2026-10-27): ThreadReactionController (WhatsApp message reactions, migration 930).
 * «حذف من المنصة» (owner 2026-10-30): MessageHideController (staff only; nothing goes to WhatsApp).
 * Delta refresh (owner 2026-10-27): ThreadDeltaService answers GET /threads/:phone?after=.
 */
@Module({
  imports: [SubscriptionsModule, LessonsModule, SalesModule, ChatListsModule],
  controllers: [ThreadsController, ThreadMediaController, ThreadFileController, ThreadFileSendController, ThreadForwardController, ThreadReopenController, ThreadReactionController, MessageHideController],
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
    PdfPreviewQueries,
    PdfPreviewService,
    ThreadFileSender,
    InboxSettings,
    ThreadQuotes,
    ForwardFiles,
    ThreadForwardService,
    KapsoReopener,
    ReopenQueries,
    ReopenTemplate,
    ReopenSettings,
    ThreadReopenService,
    ReactionQueries,
    ThreadReactionService,
    DeltaQueries,
    ThreadDeltaService,
    MessageHideRepo,
    MessageHideService,
  ],
  // The feedback module sends «ابعت طلب الرأي» through the same send-now path; meeting invitations
  // (ClassroomModule) read the thread and queue their chat text (R-MEET-02), a teacher only to the
  // families TeacherScopes lets them write to.
  exports: [Outbox, ThreadsQueries, TeacherScopes],
})
export class InboxModule {}
