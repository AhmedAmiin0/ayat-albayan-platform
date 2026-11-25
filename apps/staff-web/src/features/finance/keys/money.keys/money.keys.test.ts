import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { financeFileKeys, moneyKeys, pricingKeys } from '@/features/finance/keys';

const seeded = (keys: readonly (readonly unknown[])[]): QueryClient => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 'cached'));
  return client;
};

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = seeded(keys);
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated === true);
};

const everyMoneyRead = [
  moneyKeys.expenses('2026-11'),
  moneyKeys.expenseYear('2026'),
  moneyKeys.expenseCategories(),
  moneyKeys.receivables(),
  moneyKeys.invoices({ page: 1 }),
  moneyKeys.payments({ page: 1, filters: {}, sort: {} }),
  moneyKeys.receipt('p1'),
  moneyKeys.payouts('2026-11'),
  moneyKeys.myPayouts(),
  moneyKeys.earningsSummary(),
  moneyKeys.subscriptions({ page: 1 }),
  moneyKeys.studentSubscriptions('s1'),
  moneyKeys.balance('s1'),
  moneyKeys.tasks(),
  moneyKeys.usedBefore('sub1'),
  moneyKeys.quote('s1', { tier: 'p8' }),
  moneyKeys.earningsBalance('t1'),
  moneyKeys.earningsSessions('t1', { page: 1 }),
  moneyKeys.earningsPayments('me', { page: 1 }),
];

describe('moneyKeys', () => {
  it('keeps the key shapes the money screens already cache under', () => {
    expect(moneyKeys.all).toEqual(['money']);
    expect(moneyKeys.myPayouts()).toEqual(['money', 'payouts', 'mine']);
    expect(moneyKeys.expenseYear('2026')).toEqual(['money', 'expenses', 'year', '2026']);
    expect(moneyKeys.payments({ page: 2, filters: { kind: 'x' }, sort: {} })).toEqual([
      'money',
      'payments',
      2,
      { kind: 'x' },
      {},
    ]);
    expect(moneyKeys.studentSubscriptions('s1')).toEqual([
      'money',
      'subscriptions',
      'student',
      's1',
    ]);
    expect(moneyKeys.earningsSessions('t1', { page: 1 })).toEqual([
      'money',
      'teacher-earnings',
      't1',
      'sessions',
      { page: 1 },
    ]);
  });

  it('marks every money read stale when a money write invalidates the root', async () => {
    expect(await staleAfter(everyMoneyRead, moneyKeys.all)).toEqual(everyMoneyRead);
  });

  it('refreshes one teacher earnings without touching another teacher', async () => {
    const mine = [moneyKeys.earningsBalance('me'), moneyKeys.earningsPayments('me', { page: 1 })];
    const other = [moneyKeys.earningsBalance('t2')];
    expect(await staleAfter([...mine, ...other], moneyKeys.earnings('me'))).toEqual(mine);
  });
});

describe('financeFileKeys and pricingKeys', () => {
  it('keeps the signed links outside the money root', async () => {
    const signed = [
      financeFileKeys.attachments('/payments/p1/files'),
      financeFileKeys.teacherReceipt('p1'),
    ];
    expect(await staleAfter(signed, moneyKeys.all)).toEqual([]);
  });

  it('keys the price calculator by the API path and its search', () => {
    expect(pricingKeys.quote('tier=p8')).toEqual(['pricing', 'quote', 'tier=p8']);
    expect(pricingKeys.catalog('cur=SAR')).toEqual(['pricing', 'catalog', 'cur=SAR']);
  });
});
