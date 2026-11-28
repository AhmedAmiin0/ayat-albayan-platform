import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { page, STUDENT, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { SubscriptionsScreen } from '@/money/subscriptions/SubscriptionsScreen/SubscriptionsScreen';
import { mockCall } from '@ab/testing/mock-call';

// A cancelled package row is history only.

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// A package made by mistake: nothing paid and no lesson used (the fixture has used 2).
const unused = subscription({ id: 'a', status: 'unpaid', paid: 0 });
const mistake = {
  ...unused,
  balance: { ...unused.balance, lessons_used: 0, remaining: unused.lessons_total },
};
const gone = subscription({
  id: 'x',
  status: 'cancelled',
  paid: 0,
  student: { ...STUDENT, id: 's2', name: 'يوسف', code: 'AB-0201' },
});

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(async ({ path }) => {
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    if (path.startsWith('/admin-tasks')) return page([]);
    return page([mistake, gone]);
  });
  mockApi.reset('write');
  mockApi.onWrite(() => ({ ...mistake, status: 'cancelled' }));
});

test('only the live unpaid row offers «إلغاء الباقة»; the cancelled one shows «ملغاة»', async () => {
  await renderWithQuery(<SubscriptionsScreen />);
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.subscriptions.cancel.action })).toHaveLength(1);
  expect(screen.getAllByText(t.enums.subscriptionStatus.cancelled).length).toBeGreaterThanOrEqual(
    2,
  ); // the filter chip and the row
});

test('confirm with a reason → POST /subscriptions/:id/cancel', async () => {
  await renderWithQuery(<SubscriptionsScreen />);
  await screen.findByText(t.subscriptions.cancel.action);
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.action }));
  expect(screen.getByText(t.subscriptions.cancel.body)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText(t.subscriptions.cancel.reason),
    ' أُنشئت بالخطأ ',
  );
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.confirm }));
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/subscriptions/a/cancel',
      body: { reason: 'أُنشئت بالخطأ' },
    }),
  );
});
