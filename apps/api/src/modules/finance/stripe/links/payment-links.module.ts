import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { StripeGateModule } from '@/modules/finance/stripe/gate';
import { SalesMoneySharedModule, SalesTeacherAssignModule } from '@/modules/sales/sales-money';
import { LinkCancel } from './link-cancel';
import { LinkCreate } from './link-create';
import { LinkCreateDeps, LinkDeps, LinkSalesDeps } from './link-deps';
import { LinkPackages } from './link-packages';
import { LinkViews } from './link-views';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksRepo } from './payment-links.repo';

@Module({
  imports: [
    ...[StripeGateModule, SubscriptionsModule],
    ...[SalesMoneySharedModule, SalesTeacherAssignModule],
  ],
  controllers: [PaymentLinksController],
  providers: [
    ...[LinkViews, PaymentLinksRepo, LinkDeps, LinkCreateDeps],
    ...[LinkPackages, LinkCreate, LinkCancel, LinkSalesDeps],
  ],
  exports: [PaymentLinksRepo, LinkDeps, LinkPackages],
})
export class PaymentLinksModule {}
