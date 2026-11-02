import { describe, expect, it } from 'vitest';
import { currencyForCountry, siteCountry, SITE_COUNTRIES } from './currency.js';

describe('currencyForCountry (docs/08 §1)', () => {
  it.each([
    ['SA', 'SAR', 1],
    ['AE', 'AED', 1],
    ['QA', 'QAR', 1],
    ['KW', 'KWD', 10],
    ['OM', 'OMR', 10],
  ])('%s → %s, divisor %i', (country, iso, divisor) => {
    expect(currencyForCountry(country)).toEqual({ iso, divisor });
  });

  it.each(['EG', 'BH', 'GB', 'US', '', null, undefined, 'Oman'])('%j → USD', (country) => {
    expect(currencyForCountry(country)).toEqual({ iso: 'USD', divisor: null });
  });

  it('normalises case and spaces, keeps the site order', () => {
    expect(siteCountry(' om ')).toBe('OM');
    expect(SITE_COUNTRIES).toEqual(['SA', 'AE', 'QA', 'KW', 'OM']);
  });
});
