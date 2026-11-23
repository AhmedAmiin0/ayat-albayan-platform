import { describe, expect, it } from 'vitest';
import { StoredJsonError } from '@/common/db/stored-json';
import { payoutRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { toPayoutView } from './payouts.mapper';

describe('toPayoutView breakdown (teacher_payouts.breakdown parsed, R-PAY-02)', () => {
  it('maps a valid row as before', () => {
    expect(toPayoutView(payoutRow()).breakdown).toEqual({
      lines: [{ duration: 45, lessons: 2, rate: 70, amount: 140 }],
      lesson_ids: ['l1', 'l2'],
      statuses: ['completed'],
    });
  });

  it('reads the column default {} as an empty breakdown', () => {
    expect(toPayoutView(payoutRow({ breakdown: {} })).breakdown).toEqual({
      lines: [],
      lesson_ids: [],
      statuses: [],
    });
  });

  it('refuses a malformed breakdown instead of passing silent data on', () => {
    const bad = payoutRow({ breakdown: { lines: [], lesson_ids: [42], statuses: [] } });
    expect(() => toPayoutView(bad)).toThrow(StoredJsonError);
  });

  it('refuses a breakdown that is not an object', () => {
    expect(() => toPayoutView(payoutRow({ breakdown: ['l1'] }))).toThrow(StoredJsonError);
  });
});
