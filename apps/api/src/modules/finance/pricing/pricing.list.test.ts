import { priceList, priceListResponseSchema, quote } from '@ab/money';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fxRow, hoursAgo, NOW } from '@/modules/finance/fx/fx.fakes';
import { pricingApp } from './pricing.test-app';

let h: Awaited<ReturnType<typeof pricingApp>>;

beforeAll(async () => {
  h = await pricingApp();
});
afterAll(() => h.app.close());
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  h.fetcher.latest.mockClear();
  h.queries.newest.mockClear();
  h.queries.newest.mockResolvedValue(fxRow({ rate: 0.25 }));
});

const list = async (qs: string) => {
  const res = await h.get(`/pricing/list${qs}`);
  expect(res.statusCode).toBe(200);
  return priceListResponseSchema.parse(res.json());
};

describe('GET /pricing/list access and validation', () => {
  it('needs pricing.read, like the quote: a teacher gets 403', async () => {
    expect((await h.get('/pricing/list?country=SA', 'teacher')).statusCode).toBe(403);
  });

  it.each([
    'country=SAU',
    'country=1',
    'country=',
    'students=0',
    'students=7',
    'students=1.5',
    'discount=101',
    'discount=-1',
    'discount=abc',
    'rounding=ceil',
    'rounding=UP',
    'rounding=',
  ])('?%s is 400', async (qs) => {
    const res = await h.get(`/pricing/list?${qs}`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed' });
  });
});

describe('GET /pricing/list', () => {
  it('SA with students, a discount and rounding: the list priceList() builds, no FX', async () => {
    const body = await list('?country=sa&students=2&discount=10&rounding=down');
    const want = priceList({ country: 'SA', students: 2, discount: 10, rounding: 'down' });
    expect(body).toEqual({ ...want, fx: null });
    expect(body.groups.map((g) => g.duration)).toEqual([30, 45, 60]);
    expect(body.groups[1]?.packages.map((q) => q.afterDiscount)).toEqual([216, 324, 432, 693, 513]);
    expect(body.weekly).toMatchObject({ package: 'weekly', duration: 90, afterDiscount: 261 });
    expect(h.queries.newest).not.toHaveBeenCalled();
  });

  it('defaults: one student, no discount, nearest', async () => {
    const body = await list('?country=KW');
    expect(body).toEqual({ ...priceList({ country: 'KW', students: 1, discount: 0 }), fx: null });
    expect(body).toMatchObject({ country: 'KW', currency: 'KWD', students: 1, discount: 0 });
  });

  it.each([
    ['nearest', [86, 128, 166, 261, 200]],
    ['up', [86, 129, 167, 262, 200]],
    ['down', [85, 128, 166, 261, 199]],
  ])('rounding=%s rounds each price after the discount', async (rounding, thirty) => {
    const body = await list(`?country=SA&discount=5&rounding=${rounding}`);
    expect(body.groups[0]?.packages.map((q) => q.afterDiscount)).toEqual(thirty);
  });

  it('a country the site does not price is USD with the stored rate attached', async () => {
    const body = await list('?country=EG&students=3&discount=12.5&rounding=up');
    const want = priceList({
      country: 'EG',
      students: 3,
      discount: 12.5,
      rounding: 'up',
      usdRate: 0.25,
    });
    expect(body).toMatchObject({ country: null, currency: 'USD', discount: 12.5 });
    expect(body.groups).toEqual(want.groups);
    expect(body.fx).toEqual({
      quote: 'USD',
      rate: 0.25,
      date: hoursAgo(5),
      provider: 'open.er-api.com',
      fallback: false,
      ageHours: null,
    });
  });

  it('no country: USD; nothing stored and the API down → the peg, marked fallback', async () => {
    h.queries.newest.mockResolvedValue(null);
    h.fetcher.latest.mockRejectedValueOnce(new Error('down'));
    const body = await list('');
    expect(body).toMatchObject({ country: null, currency: 'USD' });
    expect(body.fx).toMatchObject({ provider: 'peg', fallback: true });
    expect(body.groups[1]?.packages[0]?.price).toBe(32);
  });

  it('a listed price is the /pricing/quote price for the same choice', async () => {
    const choice = 'country=OM&students=3&discount=15&rounding=down';
    const body = await list(`?${choice}`);
    const single = (await h.get(`/pricing/quote?tier=premium&duration=60&${choice}`)).json();
    expect(body.groups[2]?.packages[2]).toEqual(
      quote({
        tier: 'premium',
        duration: 60,
        country: 'OM',
        students: 3,
        discount: 15,
        rounding: 'down',
      }),
    );
    expect(single.afterDiscount).toBe(body.groups[2]?.packages[2]?.afterDiscount);
    expect(single.afterDiscount).toBe(81);
  });
});
