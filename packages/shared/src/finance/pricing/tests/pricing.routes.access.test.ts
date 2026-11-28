import { describe, expect, it } from 'vitest';
import { pricingRoutes } from '../pricing.routes';

describe('pricingRoutes: access', () => {
  it('carries one permission and the pricing tag on every route', () => {
    for (const { permissions, tags } of Object.values(pricingRoutes)) {
      expect({ permissions, tags }).toEqual({ permissions: ['pricing.read'], tags: ['pricing'] });
    }
  });
});
