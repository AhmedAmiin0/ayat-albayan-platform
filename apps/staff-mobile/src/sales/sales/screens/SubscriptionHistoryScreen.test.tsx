import { screen } from '@testing-library/react-native';
import { ApiError, t, ltr, money } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { history } from '@/sales/sales/testing/fixtures';
import { SubscriptionHistoryScreen } from './SubscriptionHistoryScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

beforeEach(() => mockApi.reset('read'));

test('the student’s subscriptions oldest first, the opened one marked; payments with date, kind and amount', async () => {
  mockApi.onRead(() => history());
  await renderWithQuery(<SubscriptionHistoryScreen />);
  expect(
    await screen.findByRole('header', {
      name: t.sales.history.title.replace('{name}', 'يوسف أحمد'),
    }),
  ).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/sales/subscriptions/s1/history',
  });
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  const headings = screen.getAllByRole('header').map((h) => h.props.children as string);
  const expired = headings.findIndex((h) => h.includes(t.enums.subscriptionStatus.expired));
  const active = headings.findIndex((h) => h.includes(t.enums.subscriptionStatus.active));
  expect(expired).toBeGreaterThan(-1);
  expect(active).toBeGreaterThan(expired);
  expect(screen.getAllByText(t.sales.history.current)).toHaveLength(1);
  expect(
    screen.getByText(
      `${ltr('2026-09-30')} — ${t.enums.paymentKind.payment} — ${money(145, 'SAR')}`,
    ),
  ).toBeTruthy();
  expect(screen.getByText(t.sales.history.noPayments)).toBeTruthy();
  expect(screen.getByText(t.sales.history.noChanges)).toBeTruthy();
  expect(screen.queryByText(/SAR|USD|EGP|\+\d{6,}/)).toBeNull();
});

test('a subscription that is not mine (404) reads «not found»; another failure the load error', async () => {
  mockApi.onRead(() => Promise.reject(new ApiError(404, { code: 'subscription_not_found' })));
  const first = await renderWithQuery(<SubscriptionHistoryScreen />);
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
  await first.unmount();
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<SubscriptionHistoryScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});
