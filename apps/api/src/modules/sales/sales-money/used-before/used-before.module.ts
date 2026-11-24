import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { SalesMoneySharedModule } from '@/modules/sales/sales-money/shared';
import { UsedBeforeAccess } from './used-before-access';
import { UsedBeforeEditController } from './used-before-edit.controller';

/** Used-lessons count edit: the admin's UsedBeforeEdit behind the ownership rule. */
@Module({
  imports: [SalesMoneySharedModule, SubscriptionsModule],
  controllers: [UsedBeforeEditController],
  providers: [UsedBeforeAccess],
})
export class UsedBeforeModule {}
