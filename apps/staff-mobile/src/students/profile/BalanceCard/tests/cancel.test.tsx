import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { balanceOf, page, subscription, SUB_ID } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { BalanceCard } from '@/students/profile/BalanceCard/BalanceCard';
import { mockCall } from '@ab/testing/mock-call';

// Package cancel only while nothing is paid.

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

function serve(balance: unknown) {
  mockApi.onRead(async ({ path }) => {
    if (path === '/students/s1/balance') return balance;
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    return page([]);
  });
}

beforeEach(() => {
  mockApi.reset('read');
  mockApi.reset('write');
});

// A package made by mistake: nothing paid and no lesson used (the fixture has used 2).
const fresh = (paid: number) => {
  const sub = subscription({ paid });
  return { ...sub, balance: { ...sub.balance, lessons_used: 0, remaining: sub.lessons_total } };
};

test('nothing paid: cancel, no reason → an empty body; a 409 has_lessons is said in Arabic', async () => {
  serve(balanceOf(fresh(0)));
  mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'has_lessons' })));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  await screen.findByText(t.subscriptions.cancel.action);
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.action }));
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.confirm }));
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: `/subscriptions/${SUB_ID}/cancel`,
      body: {},
    }),
  );
  expect(await screen.findByText(t.subscriptions.cancel.errors.has_lessons)).toBeTruthy();
});

test('money already paid: no cancel offered', async () => {
  serve(balanceOf(fresh(50)));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(t.subscriptions.balance)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
});

test('lessons already used (FIFO, any rule): no cancel offered', async () => {
  serve(balanceOf(subscription({ paid: 0 })));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(t.subscriptions.balance)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
});
