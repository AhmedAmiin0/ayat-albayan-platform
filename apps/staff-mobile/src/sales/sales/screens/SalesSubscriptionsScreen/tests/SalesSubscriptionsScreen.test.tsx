import { fireEvent, screen } from '@testing-library/react-native';
import { t, ltr } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { subscription } from '@/sales/sales/testing/fixtures';
import { SalesSubscriptionsScreen } from '@/sales/sales/screens/SalesSubscriptionsScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (mockHref: string) => mockPush(mockHref), back: jest.fn() },
}));

const pending = subscription({
  id: 'p1',
  status: 'unpaid',
  student: { id: 'st9', code: 'AB-0201', name: 'جنى علي' },
});
const confirmed = subscription({ id: 's1' });

beforeEach(() => {
  mockPush.mockReset();
  mockApi.reset('read');
  mockApi.onRead(async ({ path }) => (path.endsWith('kind=confirmed') ? [confirmed] : [pending]));
});

test('opens on «في الانتظار»: my pending subscriptions, no price and no «السجل»', async () => {
  await renderWithQuery(<SalesSubscriptionsScreen />);
  expect(await screen.findByText('جنى علي')).toBeTruthy();
  expect(screen.getByText(ltr('AB-0201'))).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/sales/subscriptions?kind=pending',
  });
  expect(
    screen.getByRole('tab', { name: t.sales.subscriptions.pending, selected: true }),
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: t.sales.history.openFor.replace('{name}', 'جنى علي') }),
  ).toBeNull();
  expect(screen.queryByText(/SAR|USD|EGP/)).toBeNull();
});

test('«مؤكدة» fetches the confirmed list only; «السجل» opens the history of that subscription', async () => {
  await renderWithQuery(<SalesSubscriptionsScreen />);
  await screen.findByText('جنى علي');
  await fireEvent.press(screen.getByRole('tab', { name: t.sales.subscriptions.confirmed }));
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(screen.queryByText('جنى علي')).toBeNull();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/sales/subscriptions?kind=confirmed',
  });
  await fireEvent.press(
    screen.getByRole('button', { name: t.sales.history.openFor.replace('{name}', 'يوسف أحمد') }),
  );
  expect(mockPush).toHaveBeenCalledWith('/more/sales/history/s1');
});

test('an empty list says so per kind', async () => {
  mockApi.onRead(() => []);
  await renderWithQuery(<SalesSubscriptionsScreen />);
  expect(await screen.findByText(t.sales.subscriptions.emptyPending)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.sales.subscriptions.confirmed }));
  expect(await screen.findByText(t.sales.subscriptions.emptyConfirmed)).toBeTruthy();
});

test('a failed read with nothing cached (offline) shows the error with a retry', async () => {
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<SalesSubscriptionsScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText(t.sales.loadFailed)).toBeTruthy();
  mockApi.onRead(() => [pending]);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('جنى علي')).toBeTruthy();
});
