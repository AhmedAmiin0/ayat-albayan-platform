import { Module } from '@nestjs/common';
import { ChatListsController } from './chat-lists.controller';
import { ChatListsRepo } from './chat-lists.repo';
import { ChatListsService } from './chat-lists.service';

/**
 * Chat lists «القوائم» (owner 2026-10-20, docs/22). InboxModule imports it for GET /threads?list= and
 * the thread's `lists` (ChatListsQueries).
 */
@Module({
  controllers: [ChatListsController],
  providers: [ChatListsRepo, ChatListsService],
  exports: [ChatListsRepo],
})
export class ChatListsModule {}
