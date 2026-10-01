import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFx, fxRow, hoursAgo, NOW, snapshot } from './fx.fakes';

// docs/08 §4: the open API is rate-limited, so a failure is not retried on every quote, and
// provider data far from the SAR/USD peg is a fault, never a price.
let fx: ReturnType<typeof fakeFx>;
const MINUTE = 60_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  fx = fakeFx();
  fx.queries.newest.mockResolvedValue(fxRow({ fetched_at: hoursAgo(30) }));
});
afterEach(() => vi.useRealTimers());

describe('FxService retry window and provider sanity (docs/08 §4)', () => {
  it('after a failed call, quotes use the stored rate for 30 min without calling again', async () => {
    fx.fetcher.latest.mockRejectedValue(new Error('fx: HTTP 429'));
    expect((await fx.service.rateSarTo('USD')).ageHours).toBe(5);
    vi.setSystemTime(NOW.getTime() + 29 * MINUTE);
    expect((await fx.service.rateSarTo('USD')).ageHours).toBe(5);
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(1);
    vi.setSystemTime(NOW.getTime() + 31 * MINUTE);
    await fx.service.rateSarTo('USD');
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(2);
  });

  it('nothing stored and the API failing: the peg, still one call per window', async () => {
    fx.queries.newest.mockResolvedValue(null);
    fx.fetcher.latest.mockRejectedValue(new Error('timeout'));
    for (let i = 0; i < 5; i++) expect((await fx.service.rateSarTo('USD')).provider).toBe('peg');
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(1);
  });

  it('a save that keeps failing does not cause a call per quote', async () => {
    fx.queries.save.mockRejectedValue(new Error('db: down'));
    await fx.service.rateSarTo('USD');
    await fx.service.rateSarTo('USD');
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['USD 100 per SAR', snapshot({ rates: { USD: 100 } })],
    ['USD 1e-9 per SAR', snapshot({ rates: { USD: 1e-9 } })],
    ['USD 6% off the peg', snapshot({ rates: { USD: (1 / 3.75) * 1.06 } })],
    ['published in the future', snapshot({ updatedAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString() })],
  ])('%s is a provider fault: not stored, the stored rate is used', async (_, snap) => {
    fx.fetcher.latest.mockResolvedValue(snap);
    expect(await fx.service.rateSarTo('USD')).toMatchObject({ rate: 0.266667, ageHours: 5 });
    expect(fx.queries.save).not.toHaveBeenCalled();
  });

  it('a rate within 5% of the peg is accepted', async () => {
    fx.fetcher.latest.mockResolvedValue(snapshot({ rates: { USD: (1 / 3.75) * 1.04 } }));
    expect((await fx.service.rateSarTo('USD')).ageHours).toBeNull();
  });
});
