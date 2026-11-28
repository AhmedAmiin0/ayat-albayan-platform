import { describe, expect, it } from 'vitest';
import { catalogQuerySchema, priceListQuerySchema, quoteQuerySchema } from '../pricing.schemas';

const issues = (r: { success: boolean; error?: { issues: { code: string }[] } }) =>
  r.error?.issues.map((i) => i.code) ?? [];

describe('catalogQuerySchema (GET /pricing/catalog)', () => {
  it('upper-cases the country and defaults the duration', () => {
    expect(catalogQuerySchema.parse({ country: 'sa' })).toEqual({ country: 'SA', duration: 45 });
  });

  it.each([['SAU'], ['']])('refuses the country %j', (country) => {
    expect(issues(catalogQuerySchema.safeParse({ country }))).toEqual(['invalid_format']);
  });

  it('refuses a length the site does not sell', () => {
    expect(catalogQuerySchema.safeParse({ duration: '50' }).success).toBe(false);
  });
});

describe('quoteQuerySchema (GET /pricing/quote)', () => {
  it('reads a package quote from text', () => {
    expect(quoteQuerySchema.parse({ tier: 'bulk', students: '2', discount: '12.5' })).toEqual({
      tier: 'bulk',
      duration: 45,
      students: 2,
      discount: 12.5,
    });
  });

  it('reads a custom count and keeps rounding left out', () => {
    const q = quoteQuerySchema.parse({ count: '20', duration: '30', rounding: 'up' });
    expect(q).toEqual({ count: 20, duration: 30, students: 1, discount: 0, rounding: 'up' });
  });

  it.each([
    [{}],
    [{ tier: 'bulk', count: '20' }],
    [{ count: '61' }],
    [{ tier: 'gold' }],
    [{ tier: 'bulk', discount: '101' }],
  ])('refuses %j', (query) => {
    expect(quoteQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('priceListQuerySchema (GET /pricing/list)', () => {
  it('has no duration and defaults the group and the discount', () => {
    expect(priceListQuerySchema.parse({ country: 'ae' })).toEqual({
      country: 'AE',
      students: 1,
      discount: 0,
    });
  });

  it('refuses an unknown rounding', () => {
    expect(priceListQuerySchema.safeParse({ rounding: 'half' }).success).toBe(false);
  });
});
