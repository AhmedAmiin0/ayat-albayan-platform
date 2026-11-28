import { quote } from '@ab/money';
import { describe, expect, it } from 'vitest';
import { pricingRoutes } from '../pricing.routes';

describe('pricingRoutes (docs/08)', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(pricingRoutes).map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /pricing/catalog',
      'GET /pricing/quote',
      'GET /pricing/list',
    ]);
  });

  it('answers a quote with the rate a USD price used', () => {
    const sar = {
      ...quote({ tier: 'bulk', duration: 45, country: 'SA', students: 1, discount: 0 }),
    };
    expect(pricingRoutes.quote.response.parse({ ...sar, fx: null })).toEqual({ ...sar, fx: null });
    expect(pricingRoutes.quote.response.safeParse(sar).success).toBe(false);
  });

  it('answers the catalog with every package of one duration', () => {
    const packages = [
      quote({ tier: 'starter', duration: 30, country: 'KW', students: 1, discount: 0 }),
    ];
    const catalog = { country: 'KW', currency: 'KWD', duration: 30, packages, fx: null };
    expect(pricingRoutes.catalog.response.parse(catalog)).toEqual(catalog);
    expect(pricingRoutes.catalog.response.safeParse({ ...catalog, currency: 'EUR' }).success).toBe(
      false,
    );
  });
});
