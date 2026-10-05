import ar from '@ab/shared/i18n/ar.json';
import { describe, expect, it } from 'vitest';
import { expenseCsv, ledgerCsv, receivablesCsv } from './finance.rows';

const F = ar.finance;

describe('finance CSV rows', () => {
  it('expenses: category label (table, else the seeded word), vendor, method, draft flag', () => {
    const rows = expenseCsv([
      { month: '2026-10-01', paid_on: '2026-10-03', category: 'rent', amount: 5000, currency: 'EGP', vendor: '=cmd', method: 'bank', note: null, recurring: true, is_draft: false, cat: null },
      { month: '2026-11-01', paid_on: null, category: 'hosting', amount: 10, currency: 'USD', vendor: null, method: null, note: 'x', recurring: true, is_draft: true, cat: { label_ar: 'استضافة' } },
    ]);
    expect(rows[1]).toEqual(['2026-10', '2026-10-03', ar.enums.expenseCategory.rent, 5000, 'EGP', "'=cmd", ar.enums.paymentMethod.bank, F.yes, '', '']);
    expect(rows[2]).toEqual(['2026-11', '', 'استضافة', 10, 'USD', '', '', F.yes, F.yes, 'x']);
  });

  it('teacher ledger: sessions block then payments block; a voided payment counts 0 and says why', () => {
    const teacher = { display_name_ar: 'أبرار' };
    const rows = ledgerCsv({
      sessions: [{ teacher, starts_at: '2026-10-01T15:00:00Z', minutes: 50, amount: 77.78, paid_amount: 30, status: 'partially_paid' }],
      payments: [
        { teacher, paid_at: '2026-10-02T09:00:00Z', amount: 30, method: 'cash', note: null, payout_id: null, voided_at: null, void_reason: null },
        { teacher, paid_at: '2026-10-03T09:00:00Z', amount: 70, method: 'bank', note: null, payout_id: 'p', voided_at: 'x', void_reason: 'خطأ' },
      ],
    });
    expect(rows[0]).toEqual([F.ledgerSessions]);
    expect(rows[2]).toEqual(['أبرار', '2026-10-01 18:00', 50, 77.78, 30, 47.78, ar.earnings.statusName.partially_paid]);
    expect(rows[6]?.[2]).toBe(30);
    expect(rows[7]).toEqual(['أبرار', '2026-10-03 12:00', 0, ar.enums.paymentMethod.bank, F.yes, F.voided.replace('{reason}', 'خطأ'), '']);
  });

  it('receivables: one row per package with days overdue and the aging words', () => {
    const rows = receivablesCsv([
      {
        id: 's1',
        student: { id: 'x', code: 'AB-0183', name: 'سهيلة' },
        guardian: { name: 'أم سهيلة', phone_e164: '+966500000001' },
        price: 450,
        currency: 'SAR',
        starts_on: '2026-08-01',
        status: 'unpaid',
        paid: 150,
        owed: 300,
        days_overdue: 65,
        bucket: '61_90',
      },
    ]);
    expect(rows[1]).toEqual(['AB-0183', 'سهيلة', 'أم سهيلة', '+966500000001', '2026-08-01', 450, 150, 300, 'SAR', 65, F.aging['61_90']]);
  });
});
