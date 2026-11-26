import { describe, expect, it } from 'vitest';
import { aPayoutView } from '../testing/views.builder';
import {
  payoutGenerateResultSchema,
  payoutListSchema,
  payoutViewSchema,
} from './payout-view.schemas';

describe('payoutViewSchema', () => {
  it('accepts a draft payout as the API maps it', () => {
    const view = aPayoutView();
    expect(payoutViewSchema.parse(view)).toEqual(view);
  });

  it('accepts a paid payout with its method, note, receipt and ledger total', () => {
    const view = aPayoutView({
      status: 'paid',
      paid_at: '2026-11-02T09:00:00.000Z',
      method: 'bank',
      note: 'تحويل',
      has_receipt: true,
      ledger_paid: 300,
    });
    expect(payoutViewSchema.parse(view)).toEqual(view);
  });

  it('rejects a currency other than EGP', () => {
    expect(payoutViewSchema.safeParse({ ...aPayoutView(), currency: 'USD' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(payoutViewSchema.safeParse({ ...aPayoutView(), status: 'sent' }).success).toBe(false);
  });

  it('rejects a breakdown whose lesson ids are not a list', () => {
    const breakdown = { lines: [], lesson_ids: 'l1', statuses: [] };
    expect(payoutViewSchema.safeParse({ ...aPayoutView(), breakdown }).success).toBe(false);
  });
});

describe('payoutGenerateResultSchema', () => {
  const missing = [{ teacher_id: 't2', display_name_ar: 'معلم', durations: [45] }];

  it('accepts the drafts and the teachers skipped for a missing rate', () => {
    const result = { month: '2026-10', payouts: [aPayoutView()], missing_rates: missing };
    expect(payoutGenerateResultSchema.parse(result)).toEqual(result);
  });

  it('rejects a result without missing_rates', () => {
    const result = { month: '2026-10', payouts: [aPayoutView()] };
    expect(payoutGenerateResultSchema.safeParse(result).success).toBe(false);
  });
});

describe('payoutListSchema', () => {
  it('rejects a list holding a payout without its teacher', () => {
    const { teacher: _teacher, ...rest } = aPayoutView();
    expect(payoutListSchema.safeParse([aPayoutView(), rest]).success).toBe(false);
  });
});
