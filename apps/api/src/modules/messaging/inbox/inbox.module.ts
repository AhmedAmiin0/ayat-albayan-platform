import { Module } from '@nestjs/common';
import { ChatListsModule } from '@/modules/messaging/chat-lists/chat-lists.module';
import { LessonsModule } from '@/modules/teaching/lessons/lessons.module';
import { SalesModule } from '@/modules/sales/sales/sales.module';
import { SubscriptionsModule } from '@/modules/finance/subscriptions/subscriptions.module';
import { InboxSettings } from './inbox.settings';
import { Outbox } from './send/outbox';
import { ReadReceipts } from './reads/read-receipts';
import { SalesThreadsService } from './sales-threads/sales-threads.service';
import { TeacherScopes } from './teacher-threads/teacher-scope';
import { TeacherThreadsRepo } from './teacher-threads/teacher-threads.repo';
import { TeacherThreadsService } from './teacher-threads/teacher-threads.service';
import { ThreadFileController } from './files/thread-file.controller';
import { ThreadFileSendController } from './files/thread-file-send.controller';
import { ThreadFileSender } from './files/thread-file-send.service';
import { ThreadMediaController } from './files/thread-media.controller';
import { ThreadMediaService } from './files/thread-media.service';
import { PdfPreviewRepo } from './files/pdf/pdf-preview.repo';
import { PdfPreviewService } from './files/pdf/pdf-preview.service';
import { ThreadReads } from './reads/thread-reads';
import { ForwardFiles } from './files/forward-files';
import { ThreadForwardController } from './files/thread-forward.controller';
import { ThreadForwardService } from './files/thread-forward.service';
import { ThreadQuotes } from './threads/thread-quotes';
import { CorrectionRepo } from './send/correction';
import { ThreadSendService } from './send/thread-send.service';
import { ThreadsController } from './threads/threads.controller';
import { ThreadsRepo } from './threads/threads.repo';
import { ThreadMessagesRepo, ThreadReadsRepo } from './threads/store';
import { ThreadsService } from './threads/threads.service';
import { ThreadReopenController } from './reopen/thread-reopen.controller';
import { ThreadReopenService } from './reopen/thread-reopen.service';
import { ReactionRepo } from './reactions/reaction.repo';
import { ThreadReactionController } from './reactions/thread-reaction.controller';
import { ThreadReactionService } from './reactions/thread-reaction.service';
import { DeltaRepo } from './delta/delta.repo';
import { ThreadDeltaService } from './delta/thread-delta.service';
import { SyncRepo, SyncThreads, SyncViews, ThreadSyncController, ThreadSyncService } from './delta';
import { MessageHideController, MessageHideRepo, MessageHideService } from './hide';
import { GifService, StickerRepo, StickersController, StickersService } from './stickers';
import {
  ChatSearchController, ChatSearchRepo, ChatSearchService,
  MessageSearchController, MessageSearchRepo, MessageSearchService,
} from './reads/search';

/** Inbox routes H1-H4 (docs/12 §4); webhook in WebhookModule, L1-L2 in LeadsModule. */
@Module({
  imports: [SubscriptionsModule, LessonsModule, SalesModule, ChatListsModule],
  controllers: [ThreadsController, ThreadMediaController, ThreadFileController, ThreadFileSendController, ThreadForwardController, ThreadReopenController, ThreadReactionController, MessageHideController, StickersController, ChatSearchController, MessageSearchController, ThreadSyncController],
  providers: [
    ThreadsRepo,
    ThreadMessagesRepo,
    ThreadReadsRepo,
    ThreadsService,
    ThreadSendService,
    ReadReceipts,
    Outbox,
    TeacherThreadsRepo,
    TeacherScopes,
    TeacherThreadsService,
    SalesThreadsService,
    ThreadReads,
    ThreadMediaService,
    PdfPreviewRepo,
    PdfPreviewService,
    ThreadFileSender,
    InboxSettings,
    ThreadQuotes,
    CorrectionRepo,
    ForwardFiles,
    ThreadForwardService,
    ThreadReopenService,
    ReactionRepo,
    ThreadReactionService,
    DeltaRepo,
    ThreadDeltaService,
    SyncRepo,
    SyncThreads,
    SyncViews,
    ThreadSyncService,
    MessageHideRepo,
    MessageHideService,
    StickerRepo,
    StickersService,
    GifService,
    ChatSearchRepo,
    ChatSearchService,
    MessageSearchRepo,
    MessageSearchService,
  ],
  // Feedback and meeting invitations (R-MEET-02) reuse this send path, within scopes.
  exports: [Outbox, ThreadsRepo, ThreadMessagesRepo, TeacherScopes],
})
export class InboxModule {}
