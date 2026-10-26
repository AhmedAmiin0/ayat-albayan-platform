import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeFx, fxRow, hoursAgo, NOW, snapshot } from './fx.fakes';
import type { FxSnapshot } from './fx.fetcher';

let fx: ReturnType<typeof fakeFx>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  fx = fakeFx();
});
afterEach(() => vi.useRealTimers());

describe('FxService.rateSarTo (docs/08 §4)', () => {
  it('reuses a rate fetched less than 24 h ago without calling the API', async () => {
    fx.queries.newest.mockResolvedValue(fxRow({ fetched_at: hoursAgo(23) }));
    expect(await fx.service.rateSarTo('USD')).toEqual({
      quote: 'USD',
      rate: 0.266667,
      date: hoursAgo(5),
      provider: 'open.er-api.com',
      fallback: false,
      ageHours: null,
    });
    expect(fx.fetcher.latest).not.toHaveBeenCalled();
  });

  it('settings.fx_fresh_hours: with 6 h, a 23 h old rate is fetched again', async () => {
    const short = fakeFx({ fx_fresh_hours: 6 });
    short.queries.newest.mockResolvedValue(fxRow({ fetched_at: hoursAgo(23) }));
    expect((await short.service.rateSarTo('USD')).rate).toBe(0.2666);
    expect(short.fetcher.latest).toHaveBeenCalledTimes(1);
  });

  it('refreshes a stale rate and stores the whole provider update', async () => {
    fx.queries.newest.mockResolvedValue(fxRow({ fetched_at: hoursAgo(25) }));
    const rate = await fx.service.rateSarTo('USD');
    expect(rate).toMatchObject({ rate: 0.2666, date: hoursAgo(1), fallback: false, ageHours: null });
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(1);
    expect(fx.queries.save).toHaveBeenCalledWith(snapshot());
  });

  it('fetches when nothing was ever stored', async () => {
    expect((await fx.service.rateSarTo('EGP')).rate).toBe(12.9);
  });

  it('API down: newest stored rate, with how old it is', async () => {
    fx.queries.newest.mockResolvedValue(fxRow({ fetched_at: hoursAgo(50), provider_updated_at: hoursAgo(60) }));
    fx.fetcher.latest.mockRejectedValue(new Error('fx: HTTP 503'));
    const rate = await fx.service.rateSarTo('USD');
    expect(rate).toMatchObject({ rate: 0.266667, fallback: false, ageHours: 60 });
    expect(fx.queries.save).not.toHaveBeenCalled();
  });

  it('API down and nothing stored: USD uses the 3.75 peg, marked fallback', async () => {
    fx.fetcher.latest.mockRejectedValue(new Error('timeout'));
    expect(await fx.service.rateSarTo('USD')).toEqual({
      quote: 'USD',
      rate: 1 / 3.75,
      date: null,
      provider: 'peg',
      fallback: true,
      ageHours: null,
    });
  });

  it('API down and nothing stored for another currency: 503 fx_unavailable', async () => {
    fx.fetcher.latest.mockRejectedValue(new Error('timeout'));
    await expect(fx.service.rateSarTo('EGP')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('a provider update without the currency counts as a failure', async () => {
    fx.fetcher.latest.mockResolvedValue(snapshot({ rates: { SAR: 1 } }));
    expect((await fx.service.rateSarTo('USD')).fallback).toBe(true);
  });

  it('a failed save still quotes the rate just fetched', async () => {
    fx.queries.newest.mockResolvedValue(fxRow({ fetched_at: hoursAgo(30) }));
    fx.queries.save.mockRejectedValue(new Error('db: down'));
    expect(await fx.service.rateSarTo('USD')).toMatchObject({ rate: 0.2666, ageHours: null });
  });

  it('concurrent stale quotes share one API call', async () => {
    let resolve: (s: FxSnapshot) => void = () => undefined;
    fx.fetcher.latest.mockReturnValue(new Promise<FxSnapshot>((r) => (resolve = r)));
    const both = Promise.all([fx.service.rateSarTo('USD'), fx.service.rateSarTo('USD')]);
    await vi.waitFor(() => expect(fx.fetcher.latest).toHaveBeenCalled());
    resolve(snapshot());
    const [a, b] = await both;
    expect(a.rate).toBe(0.2666);
    expect(b.rate).toBe(0.2666);
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(1);
    expect(fx.queries.save).toHaveBeenCalledTimes(1);
  });

  it('the next stale quote after a finished refresh calls the API again', async () => {
    await fx.service.rateSarTo('USD');
    await fx.service.rateSarTo('USD');
    expect(fx.fetcher.latest).toHaveBeenCalledTimes(2);
  });
});
