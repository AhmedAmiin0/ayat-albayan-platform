import { screen } from '@testing-library/react-native';
import { partPaidLine, paidOf } from '@/payments/format';
import { subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { SubscriptionItem } from './SubscriptionItem';

// Owner 2026-10-28 («Why is this unpaid»): 80 of 81 stays «غير مدفوعة»; the row says what is left.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('80 of 81: «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» under the unpaid chip', async () => {
  const sub = subscription({ price: 81, paid: 80 });
  await renderWithQuery(<SubscriptionItem sub={sub} />);
  const line = partPaidLine(sub);
  expect(line).not.toBeNull();
  expect(screen.getByText(line ?? '')).toBeTruthy();
  expect(screen.queryByText(paidOf(sub))).toBeNull();
});

test('nothing paid: the plain «دُفع 0 من …» line, no part-paid one', async () => {
  const sub = subscription({ price: 81, paid: 0 });
  await renderWithQuery(<SubscriptionItem sub={sub} />);
  expect(screen.getByText(paidOf(sub))).toBeTruthy();
  expect(screen.queryByText(/الباقي/)).toBeNull();
});

test('paid in full: neither line', async () => {
  await renderWithQuery(<SubscriptionItem sub={subscription({ status: 'active', price: 81, paid: 81 })} />);
  expect(screen.queryByText(/الباقي/)).toBeNull();
});
