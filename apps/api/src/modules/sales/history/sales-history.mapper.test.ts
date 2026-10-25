import { describe, expect, it } from 'vitest';
import { bundle, SUB } from '../academy/sales-academy.fakes';
import { statusChanges, toSalesHistory } from './sales-history.mapper';

describe('sales subscription history mapper', () => {
  it('statusChanges keeps the create and the real moves, drops same-status edits and unknown values', () => {
    const rows = [...bundle().audit, { entity_id: SUB, at: '2026-09-03T00:00:00Z', before_status: 'active', after_status: 'bogus' }];
    expect(statusChanges(rows)).toEqual([
      { at: '2026-09-01T10:00:00Z', from: null, to: 'unpaid' },
      { at: '2026-09-02T09:00:00Z', from: 'unpaid', to: 'active' },
    ]);
  });

  it('toSalesHistory: every subscription with lessons, dates, changes and payment date/kind/amount/currency', () => {
    const out = toSalesHistory(SUB, bundle());
    expect(out.student).toEqual({ id: 's1', code: 'AB-0101', name: 'ياسمين' });
    expect(out.subscriptions[0]).toEqual({
      id: 'old', package: '8', status: 'expired', starts_on: '2026-08-01', renews_on: null, ended_at: '2026-08-30T16:30:00Z',
      created_at: '2026-08-01T10:00:00Z', lessons_total: 8, lessons_used: 8, lessons_remaining: 0, status_changes: [], payments: [],
    });
    expect(out.subscriptions[1]?.payments).toEqual([{ id: 'p1', paid_at: '2026-09-02T09:00:00Z', kind: 'payment', amount: 290, currency: 'SAR' }]);
    expect(JSON.stringify(out)).not.toMatch(/price|fx_|method|note|bank|سر/);
  });

  it('a subscription without a balance row: nothing used, all remaining', () => {
    const b = { ...bundle(), balances: [] };
    expect(toSalesHistory(SUB, b).subscriptions[1]).toMatchObject({ lessons_used: 0, lessons_remaining: 8, ended_at: null });
  });
});
