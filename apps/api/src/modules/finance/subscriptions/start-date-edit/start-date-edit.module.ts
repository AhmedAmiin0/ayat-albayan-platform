import { Module } from '@nestjs/common';
import { SubscriptionsSharedModule } from '@/modules/finance/subscriptions/shared';
import { StartDateEditController } from './start-date-edit.controller';
import { StartDateEditRepo } from './start-date-edit.repo';
import { StartDateEdit } from './start-date-edit.service';

@Module({
  imports: [SubscriptionsSharedModule],
  controllers: [StartDateEditController],
  providers: [StartDateEdit, StartDateEditRepo],
})
export class StartDateEditModule {}
