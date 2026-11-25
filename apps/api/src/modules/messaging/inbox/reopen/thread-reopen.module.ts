import { Module } from '@nestjs/common';
import { InboxSharedModule } from '@/modules/messaging/inbox/inbox-shared.module';
import { ThreadReopenController } from './thread-reopen.controller';
import { ThreadReopenService } from './thread-reopen.service';

@Module({
  imports: [InboxSharedModule],
  controllers: [ThreadReopenController],
  providers: [ThreadReopenService],
})
export class ThreadReopenModule {}
