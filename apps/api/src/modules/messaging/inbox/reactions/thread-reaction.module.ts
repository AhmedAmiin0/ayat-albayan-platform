import { Module } from '@nestjs/common';
import { InboxSharedModule } from '@/modules/messaging/inbox/inbox-shared.module';
import { ReactionRepo } from './reaction.repo';
import { ThreadReactionController } from './thread-reaction.controller';
import { ThreadReactionService } from './thread-reaction.service';

@Module({
  imports: [InboxSharedModule],
  controllers: [ThreadReactionController],
  providers: [ReactionRepo, ThreadReactionService],
})
export class ThreadReactionModule {}
