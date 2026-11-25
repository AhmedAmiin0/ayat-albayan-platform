import { Module } from '@nestjs/common';
import { StripeGateModule } from '@/modules/finance/stripe/gate';
import { PaymentLinksModule } from '@/modules/finance/stripe/links';
import { CheckoutService } from './checkout.service';
import { PayController } from './pay.controller';
import { PayLimit } from './pay-limit';

/** The public pay page of a payment link and its Checkout session. */
@Module({
  imports: [StripeGateModule, PaymentLinksModule],
  controllers: [PayController],
  providers: [CheckoutService, PayLimit],
})
export class StripePayModule {}
