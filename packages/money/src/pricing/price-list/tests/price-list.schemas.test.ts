import { describe, expect, it } from 'vitest';
import { priceList } from '../price-list';
import { priceListResponseSchema, priceListSchema } from '../price-list.schemas';

const list = priceList({ country: 'SA', students: 2, discount: 10 });
const fx = {
  quote: 'USD',
  rate: 0.25,
  date: '2026-11-01T00:00:00.000Z',
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
};

describe('priceListResponseSchema (GET /pricing/list)', () => {
  it('refuses an answer without its fx key', () => {
    expect(priceListResponseSchema.safeParse(list).success).toBe(false);
  });

  it.each([
    ['a currency the site does not quote', { ...list, fx: null, currency: 'EGP' }],
    ['a country the site does not price', { ...list, fx: null, country: 'EG' }],
    [
      'a duration no price exists for',
      { ...list, fx: null, groups: [{ duration: 50, packages: [] }] },
    ],
    ['a group without its packages', { ...list, fx: null, groups: [{ duration: 45 }] }],
    [
      'a price that is not a number',
      { ...list, fx: null, weekly: { ...list.weekly, afterDiscount: '131' } },
    ],
    [
      'a package the catalog lacks',
      { ...list, fx: null, weekly: { ...list.weekly, package: 'gold' } },
    ],
    ['no weekly package', { ...list, fx: null, weekly: undefined }],
    ['a rate without its provider', { ...list, fx: { ...fx, provider: undefined } }],
  ])('refuses %s', (_why, body) => {
    expect(priceListResponseSchema.safeParse(body).success).toBe(false);
  });

  it('takes a site-currency list as it is, fx null', () => {
    expect(priceListResponseSchema.parse({ ...list, fx: null })).toEqual({ ...list, fx: null });
  });

  it('takes a USD list with the rate it used', () => {
    const usd = priceList({ country: null, students: 1, discount: 0, usdRate: fx.rate });
    expect(priceListResponseSchema.parse({ ...usd, fx })).toEqual({ ...usd, fx });
  });

  it('drops keys a newer server may add', () => {
    const parsed = priceListResponseSchema.parse({ ...list, fx: null, note: 'new' });
    expect(parsed).toEqual({ ...list, fx: null });
  });
});

describe('priceListSchema', () => {
  it('is the list alone, what priceList() builds', () => {
    expect(priceListSchema.parse(list)).toEqual(list);
  });
});
