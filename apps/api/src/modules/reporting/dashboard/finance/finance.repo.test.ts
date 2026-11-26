import { describe, expect, it, vi } from 'vitest';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
import type { SharedCache } from '@/common/infra/cache/shared-cache';
import { FinanceRepo } from './finance.repo';

const CARD = {
  window: { from: new Date('2026-08-31T21:00:00.000Z'), to: new Date('2026-10-31T21:00:00.000Z') },
  first: '2026-09',
  last: '2026-10',
};
const PAYMENT = {
  kind: 'payment',
  month: '2026-10',
  currency: 'SAR',
  key: 'referral',
  amount: 160,
  n: 2,
};

const repoOf = (result: FakeResult, shared?: SharedCache) => {
  const fake = fakeDb({ 'rpc:finance_card_totals': [result] });
  return { ...fake, repo: new FinanceRepo(fake.db, shared) };
};

describe('FinanceRepo.totals (one aggregate read per card, R-RPT-02)', () => {
  it('is one RPC over the Riyadh window and the first days of the months, no table read', async () => {
    const { repo, trips, argsOf } = repoOf({ data: [PAYMENT] });
    expect(await repo.totals(CARD)).toEqual([PAYMENT]);
    expect(trips).toEqual(['rpc:finance_card_totals']);
    expect(argsOf('rpc:finance_card_totals', 'rpc')).toEqual([
      {
        p_from: '2026-08-31T21:00:00.000Z',
        p_to: '2026-10-31T21:00:00.000Z',
        p_first: '2026-09-01',
        p_last: '2026-10-01',
      },
    ]);
  });

  it('a numeric sent as text is read as a number', async () => {
    const { repo } = repoOf({ data: [{ ...PAYMENT, amount: '160.50', n: '2' }] });
    expect((await repo.totals(CARD))[0]).toMatchObject({ amount: 160.5, n: 2 });
  });

  it('a database error throws', async () => {
    const { repo } = repoOf({ error: { message: 'boom' } });
    await expect(repo.totals(CARD)).rejects.toThrow(/db error .*: boom/);
  });

  it('a row of an unknown kind is refused, never summed', async () => {
    const { repo } = repoOf({ data: [{ ...PAYMENT, kind: 'bonus' }] });
    await expect(repo.totals(CARD)).rejects.toThrow();
  });

  it('is shared for 60 s under a key of its window', async () => {
    const read = vi.fn(async (input: { load: () => Promise<unknown> }) => input.load());
    const { repo } = repoOf({ data: [] }, { read } as unknown as SharedCache);
    await repo.totals(CARD);
    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'finance-card:2026-08-31T21:00:00.000Z:2026-10-31T21:00:00.000Z',
        ttlMs: 60_000,
      }),
    );
  });
});
