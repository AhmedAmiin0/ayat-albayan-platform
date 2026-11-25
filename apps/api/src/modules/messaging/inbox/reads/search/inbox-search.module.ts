import { Module } from '@nestjs/common';
import { InboxSharedModule } from '@/modules/messaging/inbox/inbox-shared.module';
import { ChatSearchController } from './chat-search.controller';
import { ChatSearchRepo } from './chat-search.repo';
import { ChatSearchService } from './chat-search.service';
import { MessageSearchController } from './message-search.controller';
import { MessageSearchRepo } from './message-search.repo';
import { MessageSearchService } from './message-search.service';

@Module({
  imports: [InboxSharedModule],
  controllers: [ChatSearchController, MessageSearchController],
  providers: [ChatSearchRepo, ChatSearchService, MessageSearchRepo, MessageSearchService],
})
export class InboxSearchModule {}
