import { describe, expect, it } from 'vitest';
import { payoutRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { EarningsRepo } from '@/modules/finance/teacher-earnings/earnings.repo';
import type { CorrectionsRepo } from '@/modules/finance/teacher-earnings/summary/corrections.repo';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
import { toPayoutView } from './payouts.mapper';
import { PayoutsLedger } from './payouts.ledger';
import type { PayoutsRepo } from './payouts.repo';

const LEDGER = 'teacher_session_earnings';
const PAID_AT = '2026-10-01T09:00:00Z';

type PayoutView = ReturnType<typeof toPayoutView>;

function ledgerOver(results: FakeResult[]) {
  const fake = fakeDb({ [LEDGER]: results });
  const earnings = new EarningsRepo(fake.db);
  const ledger = new PayoutsLedger({} as PayoutsRepo, earnings, {} as CorrectionsRepo);
  return { ledger, ...fake };
}

function view(id: string, lessonIds: string[], status: PayoutView['status'] = 'approved'): PayoutView {
  const row = payoutRow({ id, status, paid_at: status === 'paid' ? PAID_AT : null });
  return toPayoutView({ ...row, breakdown: { lines: [], lesson_ids: lessonIds, statuses: [] } });
}

describe('PayoutsLedger.annotate reads the ledger once per page', () => {
  it('N open payouts take one ledger read; each payout sums its own lessons in piasters', async () => {
    const rows = [
      { lesson_id: 'l1', paid_amount: 10.1 },
      { lesson_id: 'l2', paid_amount: 0.2 },
      { lesson_id: 'l3', paid_amount: 30 },
      { lesson_id: 'l3', paid_amount: 5 },
    ];
    const { ledger, trips, argsOf } = ledgerOver([{ data: rows }]);
    const views = [view('a', ['l1', 'l2']), view('b', ['l3', 'l9']), view('c', ['l5'], 'paid')];
    const [a, b, c] = await ledger.annotate(views);
    expect(trips).toEqual([LEDGER]);
    expect(argsOf(LEDGER, 'in')).toEqual(['lesson_id', ['l1', 'l2', 'l3', 'l9']]);
    expect(a?.ledger_paid).toBe(10.3);
    expect(b?.ledger_paid).toBe(35);
    expect(c?.ledger_paid).toBeUndefined();
  });

  it('a lesson shared by two payouts counts in both, once per payout, as before', async () => {
    const { ledger, trips } = ledgerOver([{ data: [{ lesson_id: 'l1', paid_amount: 20 }] }]);
    const [a, b] = await ledger.annotate([view('a', ['l1', 'l1']), view('b', ['l1'])]);
    expect(trips).toHaveLength(1);
    expect([a?.ledger_paid, b?.ledger_paid]).toEqual([20, 20]);
  });

  it('a page with only paid payouts reads nothing; an open one with no lessons shows 0', async () => {
    const paidOnly = ledgerOver([]);
    expect(await paidOnly.ledger.annotate([view('c', ['l1'], 'paid')])).toHaveLength(1);
    expect(paidOnly.trips).toEqual([]);
    const empty = ledgerOver([]);
    const [open] = await empty.ledger.annotate([view('a', [])]);
    expect(open?.ledger_paid).toBe(0);
    expect(empty.trips).toEqual([]);
  });

  it('a ledger error fails the list instead of showing a wrong ledger_paid', async () => {
    const { ledger } = ledgerOver([{ error: { code: 'XX000', message: 'boom' } }]);
    await expect(ledger.annotate([view('a', ['l1'])])).rejects.toThrow();
  });
});
