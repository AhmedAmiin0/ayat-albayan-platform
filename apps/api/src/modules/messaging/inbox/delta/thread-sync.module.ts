import { Module } from '@nestjs/common';
import { InboxSharedModule } from '@/modules/messaging/inbox/inbox-shared.module';
import { SyncThreads } from './sync-threads';
import { SyncViews } from './sync-views';
import { SyncRepo } from './sync.repo';
import { ThreadSyncController } from './thread-sync.controller';
import { ThreadSyncService } from './thread-sync.service';

/** The shared module also resolves SyncViews' optional ThreadQuotes, as before the split. */
@Module({
  imports: [InboxSharedModule],
  controllers: [ThreadSyncController],
  providers: [SyncRepo, SyncThreads, SyncViews, ThreadSyncService],
})
export class ThreadSyncModule {}
