import { Module } from '@nestjs/common';
import { ThreadSyncModule } from '@/modules/messaging/inbox/delta';
import { MessageHideModule } from '@/modules/messaging/inbox/hide';
import { ThreadReactionModule } from '@/modules/messaging/inbox/reactions';
import { InboxSearchModule } from '@/modules/messaging/inbox/reads/search';
import { ThreadReopenModule } from '@/modules/messaging/inbox/reopen';
import { StickersModule } from '@/modules/messaging/inbox/stickers';
import { InboxSharedModule } from './inbox-shared.module';
import { ThreadFilesModule } from './thread-files.module';
import { ThreadsModule } from './threads.module';

/**
 * Inbox routes H1-H4 (docs/12 §4), one module per feature folder; webhook in WebhookModule, L1-L2
 * in LeadsModule. Feedback and meeting invitations (R-MEET-02) reuse the shared send path, within
 * scopes, so the shared module is re-exported.
 */
@Module({
  imports: [
    ...[InboxSharedModule, ThreadsModule, ThreadFilesModule, ThreadReopenModule],
    ...[ThreadReactionModule, MessageHideModule, StickersModule, InboxSearchModule],
    ThreadSyncModule,
  ],
  exports: [InboxSharedModule],
})
export class InboxModule {}
