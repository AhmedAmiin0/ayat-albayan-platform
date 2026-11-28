import { describe, expect, it } from 'vitest';
import { myPayoutRoutes, payoutRoutes } from '../payouts.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

const payout = {
  id: '00000000-0000-4000-8000-0000000000e1',
  teacher: { id: '00000000-0000-4000-8000-0000000000e2', display_name_ar: 'T' },
  month: '2026-09',
  lessons_count: 2,
  amount: 140,
  currency: 'EGP',
  status: 'draft',
  approved_at: null,
  paid_at: null,
  breakdown: { lines: [], lesson_ids: [], statuses: [] },
  ledger_paid: 0,
};

describe('payoutRoutes and myPayoutRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(payoutRoutes).map(line)).toEqual([
      'GET /payouts',
      'POST /payouts/:month/generate',
      'POST /payouts/:id/approve',
      'POST /payouts/:id/reopen',
      'POST /payouts/:id/unpay',
      'GET /payouts/:id/receipt',
      'POST /payouts/:id/pay',
    ]);
    expect(Object.values(myPayoutRoutes).map(line)).toEqual(['GET /teachers/me/payouts']);
  });

  it('answers a month list and a generate result as the api builds them', () => {
    expect(payoutRoutes.month.response.parse([payout])).toEqual([payout]);
    const generated = { month: '2026-09', payouts: [payout], missing_rates: [] };
    expect(payoutRoutes.generate.response.parse(generated)).toEqual(generated);
  });

  it('refuses a payout in another currency or outside the payout statuses', () => {
    const r = payoutRoutes.approve.response;
    expect(r.safeParse({ ...payout, currency: 'USD' }).success).toBe(false);
    expect(r.safeParse({ ...payout, status: 'owed' }).success).toBe(false);
  });

  it('needs a month on the admin list and makes it optional on the teacher one', () => {
    expect(payoutRoutes.month.query.safeParse({}).success).toBe(false);
    expect(payoutRoutes.month.query.safeParse({ month: '2026-13' }).success).toBe(false);
    expect(myPayoutRoutes.mine.query.parse({})).toEqual({});
  });

  it('takes an unpay and a pay sent without a body as an empty one', () => {
    expect(payoutRoutes.pay.body.parse(undefined)).toEqual({});
    expect(payoutRoutes.unpay.body.safeParse(null).error?.issues[0]?.path).toEqual(['reason']);
  });

  it('refuses a payout id that is not a uuid and a month that is not YYYY-MM', () => {
    expect(payoutRoutes.approve.params.safeParse({ id: 'p1' }).success).toBe(false);
    expect(payoutRoutes.generate.params.safeParse({ month: '2026-9' }).success).toBe(false);
  });
});
