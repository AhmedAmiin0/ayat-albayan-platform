import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenErApiFetcher } from './fx.fetcher';

// h1 (docs/36): FX_API_URL may hold the key, so no failure names it; both maps become `rates`.
const KEYED = 'https://v6.exchangerate-api.com/v6/SECRET-KEY/latest/SAR';
const HEAD = { result: 'success', base_code: 'SAR', time_last_update_unix: 1_790_000_000 };

afterEach(() => vi.unstubAllGlobals());

const answer = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

async function messageOf(): Promise<string> {
  const e: unknown = await new OpenErApiFetcher(KEYED).latest().catch((x: unknown) => x);
  return e instanceof Error ? e.message : 'resolved';
}

describe('OpenErApiFetcher failures (h1)', () => {
  it("an HTTP error keeps today's message", async () => {
    answer({}, 503);
    expect(await messageOf()).toBe('fx: HTTP 503');
    answer({}, 403);
    expect(await messageOf()).toBe('fx: HTTP 403');
    answer({}, 302);
    expect(await messageOf()).toBe('fx: HTTP 302');
  });

  it('no rates map at all is a shape failure', async () => {
    answer(HEAD);
    expect(await messageOf()).toBe('fx: shape');
  });

  it('a network failure never shows the keyed URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(`fetch failed ${KEYED}`)));
    const message = await messageOf();
    expect(message).toBe('fx: network');
    expect(message).not.toContain('SECRET-KEY');
  });

  it('rates wins over conversion_rates when both are there', async () => {
    answer({ ...HEAD, rates: { USD: 1 }, conversion_rates: { USD: 2 } });
    expect((await new OpenErApiFetcher(KEYED).latest()).rates).toEqual({ USD: 1 });
  });

  it('calls FX_API_URL as it is (no trailing slash)', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...HEAD, rates: {} })));
    vi.stubGlobal('fetch', fetch);
    await new OpenErApiFetcher(KEYED).latest();
    expect(fetch.mock.calls[0]?.[0]).toBe(KEYED);
  });
});
