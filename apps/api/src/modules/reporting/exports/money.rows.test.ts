import ar from '@ab/shared/i18n/ar.json';
import { describe, expect, it } from 'vitest';
import { paymentRows, payoutLines, payoutRows, type PayoutIn } from './money.rows';

describe('paymentRows (C3)', () => {
  it('Riyadh paid time, the package word, amount as a number, the method word', () => {
    const rows = paymentRows([
      {
        paid_at: '2026-10-01T09:15:00.000Z',
        amount: 145,
        currency: 'SAR',
        method: 'bank',
        note: 'تحويل الراجحي',
        kind: 'payment',
        original_amount: null,
        original_currency: null,
        subscription: { package: '4', lessons_total: 4, student: { code: 'AB-0183', name: 'سهيلة' } },
      },
      { paid_at: '2026-10-01T09:15:00.000Z', amount: 50, currency: 'USD', method: 'other', note: null, kind: 'refund', original_amount: 190, original_currency: 'SAR', subscription: { package: null, lessons_total: 6, student: null } },
    ]);
    expect(rows[0]?.[0]).toBe(ar.payments.paidAt);
    const pay = ar.enums.paymentKind;
    expect(rows[1]).toEqual(['2026-10-01 12:15', 'AB-0183', 'سهيلة', ar.enums.packageSize[4], 4, pay.payment, 145, 'SAR', ar.enums.paymentMethod.bank, '', 'تحويل الراجحي']);
    // A refund is negative (a column sum is the net); the amount sent in another currency is kept.
    expect(rows[2]).toEqual(['2026-10-01 12:15', '', '', '', 6, pay.refund, -50, 'USD', ar.enums.paymentMethod.other, '190 SAR', '']);
  });
});

const payout = (name: string, over: Partial<PayoutIn> = {}): PayoutIn => ({
  month: '2026-09-01',
  lessons_count: 10,
  amount: 700,
  currency: 'EGP',
  status: 'approved',
  paid_at: null,
  breakdown: {
    lines: [
      { duration: 30, lessons: 8, rate: 60, amount: 480 },
      { duration: 45, lessons: 2, rate: 110, amount: 220 },
    ],
    lesson_ids: [],
    statuses: ['completed'],
  },
  teacher: { display_name_ar: name },
  ...over,
});

describe('payoutRows (C4, R-TCH-04)', () => {
  it('a total row per teacher (by name) followed by its lines', () => {
    const rows = payoutRows([payout('فاطمة', { lessons_count: 0, amount: 0, breakdown: {}, status: 'paid', paid_at: '2026-10-01T09:00:00Z' }), payout('أبرار')]);
    expect(rows.slice(1)).toEqual([
      ['أبرار', '2026-09', ar.enums.payoutStatus.approved, ar.exports.total, 10, '', 700, 'EGP', ''],
      ['أبرار', '2026-09', ar.enums.payoutStatus.approved, ar.enums.duration[30], 8, 60, 480, 'EGP', ''],
      ['أبرار', '2026-09', ar.enums.payoutStatus.approved, ar.enums.duration[45], 2, 110, 220, 'EGP', ''],
      ['فاطمة', '2026-09', ar.enums.payoutStatus.paid, ar.exports.total, 0, '', 0, 'EGP', '2026-10-01 12:00'],
    ]);
  });

  it('payoutLines skips malformed lines and keeps a missing rate as null', () => {
    expect(payoutLines(null)).toEqual([]);
    expect(payoutLines({ lines: 'x' })).toEqual([]);
    expect(
      payoutLines({ lines: [{ duration: 60, lessons: 1, rate: null, amount: 0 }, { duration: 50, lessons: 1, amount: 1 }, { duration: -5, lessons: 1, amount: 1 }, 'bad'] }),
    ).toEqual([
      { duration: 60, lessons: 1, rate: null, amount: 0 },
      // a pro-rated length (pay-rule) is a real line now
      { duration: 50, lessons: 1, rate: null, amount: 1 },
    ]);
  });
});
