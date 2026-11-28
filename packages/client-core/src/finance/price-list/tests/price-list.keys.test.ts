import { pricingRoutes } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { priceListKeys } from '../price-list.keys';

const params = { country: 'SA', students: 2, discount: 10, rounding: 'down' } as const;

describe('priceListKeys', () => {
  it('is the list route key, under the route path', () => {
    expect(priceListKeys).toBe(pricingRoutes.list.key);
    expect(priceListKeys.all).toEqual(['pricing', 'list']);
  });

  it('adds the choice as sent, one cache entry per choice', () => {
    expect(priceListKeys.of(params)).toEqual(['pricing', 'list', params]);
    expect(priceListKeys.of(params).slice(0, 2)).toEqual(priceListKeys.all);
    expect(priceListKeys.of({ ...params, rounding: 'up' })).not.toEqual(priceListKeys.of(params));
  });

  it('invalidating all reaches every cached choice', async () => {
    const cache = new QueryClient();
    cache.setQueryData(priceListKeys.of(params), {});
    cache.setQueryData(priceListKeys.of({ students: 1 }), {});
    await cache.invalidateQueries({ queryKey: priceListKeys.all });
    expect(cache.getQueryState(priceListKeys.of(params))?.isInvalidated).toBe(true);
    expect(cache.getQueryState(priceListKeys.of({ students: 1 }))?.isInvalidated).toBe(true);
  });
});
