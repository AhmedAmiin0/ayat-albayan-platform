import { Module } from '@nestjs/common';
import { InboxSharedModule } from './inbox-shared.module';
import { ThreadsController } from './threads/threads.controller';

/** Routes H1-H4 (docs/12 §4); in the inbox root because threads/ is at its folder cap. */
@Module({
  imports: [InboxSharedModule],
  controllers: [ThreadsController],
})
export class ThreadsModule {}
