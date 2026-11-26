import { quote } from '@ab/money';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { pricingCalls } from './pricing-api';

const sar = quote({ tier: 'standard', duration: 45, country: 'SA', students: 1, discount: 0 });

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('pricing calls (docs/08)', () => {
  it('asks GET /pricing/quote with the choice in the order it was given', async () => {
    const { client, apiFetch } = clientAnswering({ ...sar, fx: null });
    const query = {
      country: 'SA',
      duration: 45,
      tier: 'standard',
      students: 1,
      discount: 0,
    } as const;
    await expect(pricingCalls(client).quote(query)).resolves.toEqual({ ...sar, fx: null });
    expect(apiFetch).toHaveBeenCalledWith(
      '/pricing/quote?country=SA&duration=45&tier=standard&students=1&discount=0',
    );
  });

  it('leaves the country out of the catalog query for USD', async () => {
    const catalog = { country: null, currency: 'USD', duration: 30, packages: [], fx: null };
    const { client, apiFetch } = clientAnswering(catalog);
    await expect(pricingCalls(client).catalog({ duration: 30 })).resolves.toEqual(catalog);
    expect(apiFetch).toHaveBeenCalledWith('/pricing/catalog?duration=30');
  });

  it('refuses a quote without the rate it used', async () => {
    const { client } = clientAnswering(sar);
    const failure = await pricingCalls(client)
      .quote({ tier: 'bulk' })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/pricing/quote' } });
  });
});
