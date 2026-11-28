import { priceList } from '@ab/money';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/http';
import { priceListParams, priceListQueryOptions } from '../price-list.query-options';
import type { PriceListChoice } from '../price-list.types';

const choice: PriceListChoice = { country: 'SA', students: 2, discount: 10, rounding: 'down' };
const answer = { ...priceList({ ...choice }), fx: null };
const clientAnswering = (body: unknown) => ({
  apiFetch: vi.fn(async () => body),
  apiSend: vi.fn(),
});

describe('priceListParams', () => {
  it('sends the site country and the whole pricing choice', () => {
    expect(priceListParams(choice)).toEqual({
      country: 'SA',
      students: 2,
      discount: 10,
      rounding: 'down',
    });
  });

  it.each(['other', 'EG', '', null])('leaves the country out for %j: the API lists USD', (c) => {
    expect(priceListParams({ ...choice, country: c }).country).toBeUndefined();
  });

  it('normalises a site country however it is written', () => {
    expect(priceListParams({ ...choice, country: ' kw ' }).country).toBe('KW');
  });
});

describe('priceListQueryOptions', () => {
  it('asks GET /pricing/list with the choice and keys the cache by it', async () => {
    const client = clientAnswering(answer);
    const query = priceListQueryOptions(client, choice);
    expect(query.queryKey).toEqual(['pricing', 'list', priceListParams(choice)]);
    await expect(query.queryFn()).resolves.toEqual(answer);
    expect(client.apiFetch).toHaveBeenCalledTimes(1);
    expect(client.apiFetch).toHaveBeenCalledWith(
      '/pricing/list?country=SA&students=2&discount=10&rounding=down',
    );
  });

  it('sends no country at all for another country, and a fractional percent as it is', async () => {
    const usd = { ...priceList({ students: 1, discount: 12.5, usdRate: 0.25 }), fx: null };
    const client = clientAnswering(usd);
    const other = { country: 'other', students: 1, discount: 12.5, rounding: 'nearest' } as const;
    await priceListQueryOptions(client, other).queryFn();
    expect(client.apiFetch).toHaveBeenCalledWith(
      '/pricing/list?students=1&discount=12.5&rounding=nearest',
    );
  });

  it('two choices never share a cache entry', () => {
    const client = clientAnswering(answer);
    const a = priceListQueryOptions(client, choice).queryKey;
    expect(priceListQueryOptions(client, { ...choice, students: 3 }).queryKey).not.toEqual(a);
    expect(priceListQueryOptions(client, { ...choice, rounding: 'up' }).queryKey).not.toEqual(a);
    expect(priceListQueryOptions(client, { ...choice }).queryKey).toEqual(a);
  });

  it('refuses an answer that is not a price list, naming the path without the choice', async () => {
    const client = clientAnswering({
      ...answer,
      weekly: { ...answer.weekly, afterDiscount: '261' },
    });
    const failure = await priceListQueryOptions(client, choice)
      .queryFn()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      body: { code: 'bad_response', path: '/pricing/list', issues: ['weekly.afterDiscount'] },
    });
  });

  it('lets a failed request through as it is', async () => {
    const client = { apiFetch: vi.fn().mockRejectedValue(new ApiError(403)), apiSend: vi.fn() };
    await expect(priceListQueryOptions(client, choice).queryFn()).rejects.toThrow('API 403');
  });
});
