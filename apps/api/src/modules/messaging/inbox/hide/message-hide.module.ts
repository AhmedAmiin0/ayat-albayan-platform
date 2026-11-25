import { Module } from '@nestjs/common';
import { MessageHideController } from './message-hide.controller';
import { MessageHideRepo } from './message-hide.repo';
import { MessageHideService } from './message-hide.service';

@Module({
  controllers: [MessageHideController],
  providers: [MessageHideRepo, MessageHideService],
})
export class MessageHideModule {}
