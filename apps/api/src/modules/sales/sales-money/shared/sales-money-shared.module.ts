import { Module } from '@nestjs/common';
import { PaymentsModule } from '@/modules/finance/payments';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { SalesModule } from '@/modules/sales/sales';
import { SalesFamilyRepo } from './sales-family.repo';
import { SalesMoneyScope } from './sales-money.scope';
import { SalesMoneyServices } from './sales-money.services';
import { SalesMoneySettings } from './sales-money.settings';

/**
 * What every sales-money module injects: whose student she may act on (SalesMoneyScope over
 * SalesOwnershipRule and the family's numbers), the admin's money services her endpoints reuse
 * unchanged, and the settings slice. The Stripe link module injects the scope too.
 */
@Module({
  imports: [SalesModule, SubscriptionsModule, PaymentsModule],
  providers: [SalesMoneyScope, SalesFamilyRepo, SalesMoneyServices, SalesMoneySettings],
  exports: [SalesMoneyScope, SalesFamilyRepo, SalesMoneyServices, SalesMoneySettings],
})
export class SalesMoneySharedModule {}
