import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { ChatListsModule } from '@/modules/messaging/chat-lists';
import { SalesModule } from '@/modules/sales/sales';
import { LessonsModule } from '@/modules/teaching/lessons';
import { DeltaRepo } from './delta/delta.repo';
import { ThreadDeltaService } from './delta/thread-delta.service';
import { ForwardFiles } from './files/forward-files';
import { InboxSettings } from './inbox.settings';
import { ReadReceipts } from './reads/read-receipts';
import { ThreadReads } from './reads/thread-reads';
import { SalesThreadsService } from './sales-threads/sales-threads.service';
import { CorrectionRepo } from './send/correction';
import { Outbox } from './send/outbox';
import { ThreadSendService } from './send/thread-send.service';
import { TeacherScopes } from './teacher-threads/teacher-scope';
import { TeacherThreadsRepo } from './teacher-threads/teacher-threads.repo';
import { TeacherThreadsService } from './teacher-threads/teacher-threads.service';
import { ThreadMessagesRepo, ThreadReadsRepo } from './threads/store';
import { ThreadQuotes } from './threads/thread-quotes';
import { ThreadsRepo } from './threads/threads.repo';
import { ThreadsService } from './threads/threads.service';

/**
 * What two or more inbox feature modules inject: the per-role thread reads (admin, sales,
 * teacher) with everything they read through, the outbox and the send path. Every property
 * injection of ThreadReads, ThreadSendService and the list services is provided here, so none
 * resolves to nothing. Outbox, ThreadsRepo, ThreadMessagesRepo and TeacherScopes also leave the
 * inbox (feedback, meeting invitations, calls).
 */
@Module({
  imports: [SubscriptionsModule, LessonsModule, SalesModule, ChatListsModule],
  providers: [
    ...[ThreadsRepo, ThreadMessagesRepo, ThreadReadsRepo, ThreadsService, ThreadReads],
    ...[ReadReceipts, Outbox, ThreadSendService, CorrectionRepo, ThreadQuotes, InboxSettings],
    ...[TeacherThreadsRepo, TeacherScopes, TeacherThreadsService, SalesThreadsService],
    ...[ForwardFiles, DeltaRepo, ThreadDeltaService],
  ],
  exports: [
    ...[ThreadReads, ThreadsRepo, ThreadMessagesRepo, Outbox, ThreadSendService, TeacherScopes],
    ...[ThreadQuotes, InboxSettings, ForwardFiles],
    ...[ThreadsService, SalesThreadsService, TeacherThreadsService],
  ],
})
export class InboxSharedModule {}
