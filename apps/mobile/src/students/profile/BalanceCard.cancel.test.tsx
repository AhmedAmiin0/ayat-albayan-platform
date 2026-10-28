import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { balanceOf, page, subscription, SUB_ID } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { BalanceCard } from './BalanceCard';

// «إلغاء الباقة» on the profile's balance card (owner 2026-10-28): nothing paid only; a 409 reads in Arabic.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

function serve(balance: unknown) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/students/s1/balance') return balance;
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    return page([]);
  });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

// A package made by mistake: nothing paid and no lesson used (the fixture has used 2).
const fresh = (paid: number) => {
  const sub = subscription({ paid });
  return { ...sub, balance: { ...sub.balance, lessons_used: 0, remaining: sub.lessons_total } };
};

test('nothing paid: cancel, no reason → an empty body; a 409 has_lessons is said in Arabic', async () => {
  serve(balanceOf(fresh(0)));
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'has_lessons' }));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  await screen.findByText(t.subscriptions.cancel.action);
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.action }));
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', `/subscriptions/${SUB_ID}/cancel`, {}));
  expect(await screen.findByText(t.subscriptions.cancel.errors.has_lessons)).toBeTruthy();
});

test('money already paid: no cancel offered', async () => {
  serve(balanceOf(fresh(50)));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(t.payments.mobile.record)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
});

test('lessons already used (FIFO, any rule): no cancel offered', async () => {
  serve(balanceOf(subscription({ paid: 0 })));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(t.payments.mobile.record)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
});
