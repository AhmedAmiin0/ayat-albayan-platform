import type { FxRate } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { conversionFrom, convert, round2 } from './conversion';

const rate = (quote: string, r: number, date: string | null = '2026-10-01T00:00:00Z'): FxRate => ({
  quote,
  rate: r,
  date,
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
});
const SAR: FxRate = { ...rate('SAR', 1, null), provider: 'self' };

describe('conversionFrom (R-RPT-02 FX)', () => {
  it('reporting SAR: 1 SAR = rate(SAR→X) X; the date is the rate date used', () => {
    const c = conversionFrom({
      reporting: 'SAR',
      base: SAR,
      quotes: [['EGP', rate('EGP', 13, '2026-10-01T00:00:00Z')], ['USD', rate('USD', 0.2667, '2026-09-30T00:00:00Z')]],
    });
    expect(c.rates).toEqual({ SAR: 1, EGP: 13, USD: 0.2667 });
    expect(c.date).toBe('2026-09-30T00:00:00Z');
    expect(convert(c, 1300, 'EGP')).toBe(100);
    expect(convert(c, 145, 'SAR')).toBe(145);
  });

  it('reporting EGP: amounts in SAR go through the SAR→EGP rate', () => {
    const c = conversionFrom({ reporting: 'EGP', base: rate('EGP', 13), quotes: [['SAR', SAR]] });
    expect(c.rates['SAR']).toBeCloseTo(1 / 13);
    expect(round2(convert(c, 100, 'SAR') ?? 0)).toBe(1300);
  });

  it('a currency without a rate is missing and converts to null; nothing to convert → date null', () => {
    const c = conversionFrom({ reporting: 'SAR', base: SAR, quotes: [['KWD', null]] });
    expect(c.missing).toEqual(['KWD']);
    expect(convert(c, 10, 'KWD')).toBeNull();
    expect(c.date).toBeNull();
  });

  it('no SAR→reporting rate: every other currency is missing', () => {
    const c = conversionFrom({ reporting: 'EGP', base: null, quotes: [['USD', rate('USD', 0.27)], ['SAR', SAR]] });
    expect(c.missing).toEqual(['SAR', 'USD']);
    expect(c.rates).toEqual({ EGP: 1 });
  });

  it('round2 rounds money to 2 decimals', () => {
    expect(round2(10.005 + 0.0001)).toBe(10.01);
    expect(round2(1 / 3)).toBe(0.33);
  });
});
