// HTTP harness of the Stripe test build (test-only). The test file sets FEATURE_STRIPE first (vi.hoisted),
// so AppModule mounts StripeTestModule; the money harness's mocks plus the Stripe module's own.
import { PushService } from '../../../../common/push/push.service';
import { SalesTeacherAssign } from '../../../sales/sales-money';
import { moneyApp } from '../../subscriptions/test-app';
import { STRIPE_FACTORY } from '../gate/stripe-clients';
import { StripeSettingsQueries } from '../gate/stripe-settings.queries';
import { PaymentLinksQueries } from '../links/payment-links.queries';
import { PayLimit } from '../pay/pay-limit';
import { StripeEventsQueries } from '../webhook/stripe-events.queries';
import { stripeMocks } from './stripe-mocks.fakes';

export async function stripeApp() {
  const s = stripeMocks();
  const app = await moneyApp(undefined, (b) =>
    b
      .overrideProvider(StripeSettingsQueries).useValue(s.settings)
      .overrideProvider(PaymentLinksQueries).useValue(s.links)
      .overrideProvider(StripeEventsQueries).useValue(s.events)
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
