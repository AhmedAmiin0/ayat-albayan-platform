import { stripeRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { StripeWebhookController } from '@/modules/finance/stripe/webhook/stripe-webhook.controller';

describe('StripeWebhookController: public through its route object', () => {
  const handler = StripeWebhookController.prototype.receive;

  it('serves the webhook route and is public from it alone', () => {
    expect(routeOf(handler)).toBe(stripeRoutes.webhook);
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBe(true);
    expect(Reflect.getMetadata(OWN_PUBLIC, StripeWebhookController)).toBeUndefined();
  });
});
