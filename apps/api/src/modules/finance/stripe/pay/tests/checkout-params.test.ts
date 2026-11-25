import { describe, expect, it } from 'vitest';
import { toPublicLink } from '@/modules/finance/stripe/links/payment-links.mapper';
import { linkRow } from '@/modules/finance/stripe/testing/stripe-mocks.fakes';
import { checkoutParams, sessionExpiry } from '@/modules/finance/stripe/pay/checkout-params';

const NOW = new Date('2026-10-28T10:00:00Z');
const s = (iso: string) => Date.parse(iso) / 1000;

describe('Checkout Session parameters', () => {
  it('expiry: at most 23 h, never past the link, never under Stripe’s 30 min minimum', () => {
    expect(sessionExpiry('2026-11-04T10:00:00Z', NOW)).toBe(s('2026-10-29T09:00:00Z'));
    expect(sessionExpiry('2026-10-28T15:00:00Z', NOW)).toBe(s('2026-10-28T15:00:00Z'));
    expect(sessionExpiry('2026-10-28T10:05:00Z', NOW)).toBe(s('2026-10-28T10:31:00Z'));
  });

  it('a USD link in cents, the product named in Arabic, never payment_method_types', () => {
    const p = checkoutParams(linkRow({ currency: 'USD', amount: 49.99 }), { payOrigin: 'https://api.example.com', now: NOW });
    expect(p.line_items?.[0]?.price_data).toMatchObject({ currency: 'usd', unit_amount: 4999, product_data: { name: expect.stringContaining('4') } });
    expect(p.payment_intent_data?.metadata).toEqual(p.metadata);
    expect(Object.keys(p)).not.toContain('payment_method_types');
  });

  it('per currency: QAR in hundredths, KWD / OMR in thousandths ending in 0', () => {
    const ctx = { payOrigin: 'https://api.example.com', now: NOW };
    const unit = (currency: string, amount: number) =>
      checkoutParams(linkRow({ currency, amount }), ctx).line_items?.[0]?.price_data;
    expect(unit('QAR', 122)).toMatchObject({ currency: 'qar', unit_amount: 12200 });
    expect(unit('KWD', 12.5)).toMatchObject({ currency: 'kwd', unit_amount: 12500 });
    expect(unit('OMR', 12.25)).toMatchObject({ currency: 'omr', unit_amount: 12250 });
  });
});

describe('the public view', () => {
  it('processing while an async payment is pending; the first name only', () => {
    expect(toPublicLink(linkRow({ processing: true }), NOW)).toMatchObject({ status: 'processing', first_name: 'سهيلة' });
    expect(JSON.stringify(toPublicLink(linkRow(), NOW))).not.toMatch(/AB-0183|أحمد|tok_/);
  });
});
