import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { SalesMoneySharedModule } from '@/modules/sales/sales-money/shared';
import { AnyPackageCancelController } from './any-package-cancel.controller';
import { AnyPackageCancel } from './any-package-cancel.service';
import { SalesPackageCancel } from './sales-package-cancel';

/**
 * Package cancel on the admin's SubscriptionCancel: ANY student's package (POST /sales/packages,
 * subscriptions.stop) here, her own student's (SalesPackageCancel) on SalesSubscribeController.
 */
@Module({
  imports: [SalesMoneySharedModule, SubscriptionsModule],
  controllers: [AnyPackageCancelController],
  providers: [AnyPackageCancel, SalesPackageCancel],
  exports: [SalesPackageCancel],
})
export class SalesPackageCancelModule {}
