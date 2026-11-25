import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  applicantKeys,
  leadKeys,
  myMoneyKeys,
  paymentLinkKeys,
  publicLinkKeys,
  salesKeys,
  salesMoneyKeys,
  salesSubscriptionKeys,
  stripeKeys,
} from '@/features/sales/keys';

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 'cached'));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated === true);
};

const PRICING = { lessons: 8 };

describe('sales keys', () => {
  it('keeps the key shapes the sales screens already cache under', () => {
    expect(salesKeys.allStudents({ page: 2, search: 'a' })).toEqual([
      'sales',
      'students',
      'all',
      2,
      'a',
    ]);
    expect(salesKeys.scheduleDay({ date: '2026-11-25' })).toEqual([
      'sales',
      'schedule',
      '2026-11-25',
      '',
    ]);
    expect(salesKeys.registrationCheck('/x')).toEqual(['sales', 'registration-check', '/x']);
    expect(salesSubscriptionKeys.history('p1')).toEqual([
      'sales',
      'subscriptions',
      'history',
      'p1',
    ]);
    expect(myMoneyKeys.commissions(3)).toEqual(['sales', 'me', 'commissions', 3]);
    expect(salesMoneyKeys.chatReceipt('s1', 'm1')).toEqual([
      'sales',
      'money',
      'chat-receipt',
      's1',
      'm1',
    ]);
    expect(paymentLinkKeys.quote('s1', PRICING)).toEqual([
      'sales',
      'payment-links',
      'quote',
      's1',
      PRICING,
    ]);
    expect(leadKeys.list({ page: 1 })).toEqual(['leads', { page: 1 }]);
    expect(applicantKeys.list({ page: 1 })).toEqual(['job-applicants', { page: 1 }]);
    expect(stripeKeys.feature()).toEqual(['stripe', 'feature']);
    expect(publicLinkKeys.link('tok')).toEqual(['pay', 'tok']);
  });

  it('marks every sales read stale when a lesson move invalidates the sales root', async () => {
    const reads = [
      salesKeys.live(),
      salesKeys.scheduleDay({ date: 'd', teacherId: 't1' }),
      salesSubscriptionKeys.list('pending'),
      myMoneyKeys.earnings(),
      salesMoneyKeys.family('+201'),
      paymentLinkKeys.list(),
    ];
    expect(await staleAfter(reads, salesKeys.all)).toEqual(reads);
  });

  it('re-reads every schedule day after a confirm or a cancel, and nothing else', async () => {
    const days = [salesKeys.scheduleDay({ date: 'd1' }), salesKeys.scheduleDay({ date: 'd2' })];
    const others = [salesKeys.live(), salesKeys.teachers()];
    expect(await staleAfter([...days, ...others], salesKeys.schedule)).toEqual(days);
  });

  it('refreshes the wallet, the chat money and the subscriptions apart', async () => {
    const wallet = [myMoneyKeys.students(), myMoneyKeys.commissions(1), myMoneyKeys.payments()];
    const money = [salesMoneyKeys.quote('s1', PRICING), salesMoneyKeys.course('s1')];
    const subs = [salesSubscriptionKeys.teachers(), salesSubscriptionKeys.history('p1')];
    const all = [...wallet, ...money, ...subs];
    expect(await staleAfter(all, myMoneyKeys.all)).toEqual(wallet);
    expect(await staleAfter(all, salesMoneyKeys.all)).toEqual(money);
    expect(await staleAfter(all, salesSubscriptionKeys.all)).toEqual(subs);
  });

  it('keeps leads and applicants off the sales root, and an assign reaches the people list', async () => {
    const outside = [leadKeys.list({ page: 1 }), applicantKeys.list({ page: 1 })];
    expect(await staleAfter(outside, salesKeys.all)).toEqual([]);
    expect(await staleAfter([salesKeys.people(), ...outside], salesKeys.people())).toEqual([
      salesKeys.people(),
    ]);
    expect(await staleAfter(outside, leadKeys.all)).toEqual([outside[0]]);
  });

  it('keeps the public pay page and the Stripe switch off every sales write', async () => {
    const reads = [publicLinkKeys.link('tok'), stripeKeys.feature()];
    expect(await staleAfter(reads, salesKeys.all)).toEqual([]);
  });
});
