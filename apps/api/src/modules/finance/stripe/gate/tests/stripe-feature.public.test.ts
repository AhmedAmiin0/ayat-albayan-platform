import { stripeRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { StripeFeatureController } from '@/modules/finance/stripe/gate/stripe-feature.controller';

describe('StripeFeatureController: public through its route object', () => {
  const handler = StripeFeatureController.prototype.get;

  it('serves the feature route and is public from it alone', () => {
    expect(routeOf(handler)).toBe(stripeRoutes.feature);
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBe(true);
    expect(Reflect.getMetadata(OWN_PUBLIC, StripeFeatureController)).toBeUndefined();
  });
});
