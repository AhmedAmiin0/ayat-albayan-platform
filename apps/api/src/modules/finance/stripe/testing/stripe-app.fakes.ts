// HTTP harness of the Stripe test build (test-only). The test file sets FEATURE_STRIPE first (vi.hoisted),
// so AppModule mounts StripeTestModule; the money harness's mocks plus the Stripe module's own.
import { PushService } from '@/common/push/push.service';
import { SalesTeacherAssign } from '@/modules/sales/sales-money';
import { moneyApp } from '@/modules/finance/subscriptions/test-app';
import { STRIPE_FACTORY } from '@/modules/finance/stripe/gate/stripe-clients';
import { PaymentLinksRepo } from '@/modules/finance/stripe/links/payment-links.repo';
import { PayLimit } from '@/modules/finance/stripe/pay/pay-limit';
import { StripeEventsRepo } from '@/modules/finance/stripe/webhook/stripe-events.repo';
import { stripeMocks } from './stripe-mocks.fakes';

export async function stripeApp() {
  const s = stripeMocks();
  const app = await moneyApp(undefined, (b) =>
    b
      .overrideProvider(PaymentLinksRepo).useValue(s.links)
      .overrideProvider(StripeEventsRepo).useValue(s.events)
      .overrideProvider(PayLimit).useValue(s.limit)
      .overrideProvider(PushService).useValue(s.push)
      .overrideProvider(SalesTeacherAssign).useValue(s.teachers)
      .overrideProvider(STRIPE_FACTORY).useValue(() => s.stripe),
  );
  /** A webhook POST with Stripe's header (no bearer token). */
  const hook = (body: string, signature: string) =>
    app.app.inject({ method: 'POST', url: '/webhooks/stripe', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, payload: body });
  return { ...app, s, hook };
}
