import { QueryClient } from '@tanstack/react-query';
import { salesKeys, subscriptionKeys } from '@/core/lib/keys';

const PRICING = { months: 1 };

it('keeps the key shapes the sales screens already cache under', () => {
  expect(salesKeys.quote('s1', PRICING, {})).toEqual([
    'sales',
    'subscriptions',
    'quote',
    's1',
    PRICING,
    {},
  ]);
  expect(salesKeys.teachers()).toEqual(['sales', 'subscriptions', 'teachers']);
  expect(salesKeys.subscriptions('pending')).toEqual(['sales', 'subscriptions', 'pending']);
  expect(salesKeys.schedule('2026-11-25', 't1')).toEqual(['sales', 'schedule', '2026-11-25', 't1']);
  expect(salesKeys.family('+201')).toEqual(['sales', 'money', 'family', '+201']);
  expect(salesKeys.chatReceipts('s1')).toEqual(['sales', 'money', 'chat-receipts', 's1']);
  expect(salesKeys.chatReceipt('s1', 'm1')).toEqual([
    'sales',
    'money',
    'chat-receipts',
    's1',
    'm1',
  ]);
  expect(salesKeys.registrationCheck(null)).toEqual(['sales', 'registration-check', null]);
  expect(salesKeys.attendance('/sales/students/s1/attendance', null)).toEqual([
    'sales',
    'students',
    's1',
    'attendance',
    'current',
  ]);
  expect(subscriptionKeys.quote('s1', PRICING)).toEqual(['subscriptions', 'quote', 's1', PRICING]);
});

it('keeps the payment link list and quote under one root', () => {
  expect(salesKeys.linkList()).toEqual(['sales', 'payment-links', 'list']);
  expect(salesKeys.linkQuote('s1', PRICING)).toEqual([
    'sales',
    'payment-links',
    'quote',
    's1',
    PRICING,
  ]);
});

const invalidated = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 1));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.map((key) => client.getQueryState(key)?.isInvalidated);
};

it('a new link refreshes the list but not the body-keyed quote', async () => {
  const keys = [salesKeys.linkList(), salesKeys.linkQuote('s1', PRICING)];
  expect(await invalidated(keys, salesKeys.linkList())).toEqual([true, false]);
});

it('a family write reaches every phone, and no chat receipt', async () => {
  const keys = [salesKeys.family('+201'), salesKeys.family('+202'), salesKeys.chatReceipts('s1')];
  expect(await invalidated(keys, salesKeys.families)).toEqual([true, true, false]);
});

it('a sales write reaches every sales read, and not the admin quote', async () => {
  const keys = [
    salesKeys.quote('s1', PRICING, {}),
    salesKeys.family('+201'),
    salesKeys.chatReceipt('s1', 'm1'),
    salesKeys.subscriptions('confirmed'),
    subscriptionKeys.quote('s1', PRICING),
  ];
  expect(await invalidated(keys, salesKeys.all)).toEqual([true, true, true, true, false]);
});
