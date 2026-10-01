import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenErApiFetcher } from './fx.fetcher';

// fetch is stubbed: unit tests never touch the network.
const URL_OPEN = 'https://open.er-api.com/v6/latest/SAR';
const BODY = {
  result: 'success',
  base_code: 'SAR',
  time_last_update_unix: 1_790_000_000,
  rates: { SAR: 1, USD: 0.266667 },
};

function stubFetch(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
afterEach(() => vi.unstubAllGlobals());

describe('OpenErApiFetcher (docs/08 §4)', () => {
  it('parses rates, publication time and provider host, with a timeout signal', async () => {
    const fetch = stubFetch(BODY);
    expect(await new OpenErApiFetcher(URL_OPEN).latest()).toEqual({
      base: 'SAR',
      rates: { SAR: 1, USD: 0.266667 },
      updatedAt: new Date(1_790_000_000_000).toISOString(),
      provider: 'open.er-api.com',
    });
    expect(fetch).toHaveBeenCalledWith(URL_OPEN, { signal: expect.any(AbortSignal) });
  });

  it('accepts the keyed API shape (conversion_rates) and keeps the key out of provider', async () => {
    const { rates, ...rest } = BODY;
    stubFetch({ ...rest, conversion_rates: rates });
    const snap = await new OpenErApiFetcher('https://v6.exchangerate-api.com/v6/SECRET/latest/SAR').latest();
    expect(snap.rates['USD']).toBe(0.266667);
    expect(snap.provider).toBe('v6.exchangerate-api.com');
  });

  it.each([
    ['HTTP error', BODY, 503],
    ['error result', { ...BODY, result: 'error' }, 200],
    ['non-SAR base', { ...BODY, base_code: 'USD' }, 200],
    ['no rates', { ...BODY, rates: undefined }, 200],
  ])('rejects on %s', async (_label, body, status) => {
    stubFetch(body, status);
    await expect(new OpenErApiFetcher(URL_OPEN).latest()).rejects.toThrow();
  });
});
