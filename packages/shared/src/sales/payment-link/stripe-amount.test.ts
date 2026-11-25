import { describe, expect, it } from 'vitest';
import { fromStripeAmount, toStripeAmount } from './rules';

describe('amounts as Stripe counts them, per currency', () => {
  it('2-decimal currencies: hundredths (SAR, AED, QAR, USD)', () => {
    expect(toStripeAmount(290.5, 'SAR')).toBe(29050);
    expect(toStripeAmount(122, 'QAR')).toBe(12200);
    expect(toStripeAmount(0.1 + 0.2, 'aed')).toBe(30);
    expect(fromStripeAmount(12200, 'qar')).toBe(122);
    expect(fromStripeAmount(29050, 'USD')).toBe(290.5);
  });

  it('KWD / OMR: thousandths, always ending in 0 as Stripe requires', () => {
    expect(toStripeAmount(12.5, 'KWD')).toBe(12500);
    expect(toStripeAmount(12.25, 'omr')).toBe(12250);
    expect(toStripeAmount(0.1 + 0.2, 'KWD') % 10).toBe(0);
    expect(fromStripeAmount(12500, 'kwd')).toBe(12.5);
    expect(fromStripeAmount(12250, 'OMR')).toBe(12.25);
  });

  it('a 3-decimal amount from the Dashboard rounds to the stored 2 decimals', () => {
    expect(fromStripeAmount(12345, 'KWD')).toBe(12.35);
    expect(fromStripeAmount(12344, 'KWD')).toBe(12.34);
  });

  it('round trip for every link currency', () => {
    for (const c of ['SAR', 'AED', 'QAR', 'KWD', 'OMR', 'USD']) {
      expect(fromStripeAmount(toStripeAmount(145.75, c), c)).toBe(145.75);
    }
  });
});
