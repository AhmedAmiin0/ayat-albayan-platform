import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fxRow, NOW } from '@/modules/finance/fx/fx.fakes';
import { pricingApp } from './pricing.test-app';

let h: Awaited<ReturnType<typeof pricingApp>>;

beforeAll(async () => {
  h = await pricingApp();
});
afterAll(() => h.app.close());
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  h.queries.newest.mockResolvedValue(fxRow({ rate: 0.25 }));
});

const after = async (qs: string): Promise<unknown> =>
  (await h.get(`/pricing/quote?${qs}`)).json().afterDiscount;

describe('GET /pricing/quote?rounding=', () => {
  // SA bulk at 30 minutes with 5 % is 261.25.
  const bulk = 'tier=bulk&duration=30&country=SA&discount=5';

  it.each([
    ['nearest', 261],
    ['up', 262],
    ['down', 261],
  ])('rounding=%s → %i', async (rounding, want) => {
    expect(await after(`${bulk}&rounding=${rounding}`)).toBe(want);
  });

  it('left out, it is nearest: the price as before the option', async () => {
    expect(await after(bulk)).toBe(261);
    expect(await after('tier=standard&country=KW&students=3&discount=10')).toBe(49);
  });

  it('rounds the price after the discount and nothing else', async () => {
    const plain = (await h.get(`/pricing/quote?${bulk}`)).json();
    const up = (await h.get(`/pricing/quote?${bulk}&rounding=up`)).json();
    expect(up).toEqual({ ...plain, afterDiscount: 262 });
    expect(up).not.toHaveProperty('rounding');
  });

  it('a custom count and USD round the same way', async () => {
    expect(await after('count=10&duration=45&country=EG&discount=5&rounding=down')).toBe(36);
    expect(await after('count=10&duration=45&country=EG&discount=5&rounding=up')).toBe(37);
  });

  it('float noise never moves a price: 90 × (1 − 30 %) stays 63', async () => {
    const starter = 'tier=starter&duration=30&country=SA&discount=30';
    expect(await after(`${starter}&rounding=down`)).toBe(63);
    expect(await after(`${starter}&rounding=up`)).toBe(63);
  });

  it('with no discount every mode is the total', async () => {
    for (const rounding of ['nearest', 'up', 'down']) {
      expect(await after(`tier=premium&country=OM&students=4&rounding=${rounding}`)).toBe(96);
    }
  });

  it.each(['rounding=ceil', 'rounding=Up', 'rounding=', 'rounding=1'])(
    '?tier=starter&%s is 400',
    async (qs) => {
      const res = await h.get(`/pricing/quote?tier=starter&${qs}`);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ message: 'validation_failed' });
    },
  );
});
