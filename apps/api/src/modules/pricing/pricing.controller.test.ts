import { PACKAGE_IDS } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fxRow, hoursAgo, NOW } from '../fx/fx.fakes';
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
  h.queries.newest.mockResolvedValue(fxRow({ rate: 0.25 }));
});

describe('/pricing access and validation', () => {
  it('is admin-only: a teacher gets 403', async () => {
    expect((await h.get('/pricing/catalog?country=SA', 'teacher')).statusCode).toBe(403);
    expect((await h.get('/pricing/quote?tier=starter', 'teacher')).statusCode).toBe(403);
  });

  it.each([
    'duration=90',
    'duration=abc',
    'country=SAU',
    'country=1',
  ])('catalog ?%s is 400', async (qs) => {
    expect((await h.get(`/pricing/catalog?${qs}`)).statusCode).toBe(400);
  });

  it.each([
    '',
    'tier=gold',
    'tier=starter&count=8',
    'count=0',
    'count=61',
    'count=2.5',
    'tier=starter&students=0',
    'tier=starter&students=21',
    'tier=starter&discount=20',
    'tier=starter&duration=50',
  ])('quote ?%s is 400', async (qs) => {
    expect((await h.get(`/pricing/quote?${qs}`)).statusCode).toBe(400);
  });
});

describe('GET /pricing/catalog', () => {
  it('SA, default 45 min: the six site packages in SAR, no FX', async () => {
    const res = await h.get('/pricing/catalog?country=sa');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ country: 'SA', currency: 'SAR', duration: 45, fx: null });
    expect(body.packages.map((p: { package: string }) => p.package)).toEqual([...PACKAGE_IDS]);
    expect(body.packages.map((p: { price: number }) => p.price)).toEqual([120, 180, 240, 385, 145, 285]);
    expect(h.queries.newest).not.toHaveBeenCalledWith('USD');
  });

  it('OM at 60 min divides by 10', async () => {
    const body = (await h.get('/pricing/catalog?country=OM&duration=60')).json();
    expect(body.currency).toBe('OMR');
    expect(body.packages.map((p: { price: number }) => p.price)).toEqual([16, 24, 32, 50, 15, 38]);
  });

  it('another country is USD with the stored rate attached', async () => {
    const body = (await h.get('/pricing/catalog?country=EG&duration=45')).json();
    expect(body).toMatchObject({ country: null, currency: 'USD' });
    expect(body.packages.map((p: { price: number }) => p.price)).toEqual([30, 45, 60, 97, 37, 72]);
    expect(body.fx).toEqual({
      quote: 'USD',
      rate: 0.25,
      date: hoursAgo(5),
      provider: 'open.er-api.com',
      fallback: false,
      ageHours: null,
    });
    expect(h.fetcher.latest).not.toHaveBeenCalled();
  });
});

describe('GET /pricing/quote', () => {
  it('KW standard, 3 students, 10 %', async () => {
    const res = await h.get('/pricing/quote?tier=standard&country=KW&students=3&discount=10');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      package: 'standard',
      currency: 'KWD',
      price: 18,
      total: 54,
      afterDiscount: 49,
      perLesson: 1.35,
      fx: null,
    });
  });

  it('custom count in QA', async () => {
    const body = (await h.get('/pricing/quote?count=27&duration=30&country=QA')).json();
    expect(body).toMatchObject({ package: 'custom', lessons: 27, price: 304, currency: 'QAR' });
  });

  it('no country: USD; no stored rate and the API down → the peg, marked fallback', async () => {
    h.queries.newest.mockResolvedValue(null);
    h.fetcher.latest.mockRejectedValueOnce(new Error('down'));
    const body = (await h.get('/pricing/quote?tier=starter')).json();
    expect(body).toMatchObject({ currency: 'USD', price: 32, fx: { provider: 'peg', fallback: true } });
  });
});
