import { pricingRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { priceListKeys } from '../price-list.keys';

describe('priceListKeys', () => {
  it('sits under the route path, so one key reaches every cached list', () => {
    expect(pricingRoutes.list.path).toBe('/pricing/list');
    expect(priceListKeys.all).toEqual(['pricing', 'list']);
  });

  it('adds the choice as sent, one cache entry per choice', () => {
    const params = { country: 'SA', students: 2, discount: 10, rounding: 'down' };
    expect(priceListKeys.of(params)).toEqual(['pricing', 'list', params]);
    expect(priceListKeys.of(params).slice(0, 2)).toEqual(priceListKeys.all);
    expect(priceListKeys.of({ ...params, rounding: 'up' })).not.toEqual(priceListKeys.of(params));
  });
});
