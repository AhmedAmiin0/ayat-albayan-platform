import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { page, STUDENT, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { SubscriptionsScreen } from './SubscriptionsScreen';

// «إلغاء الباقة» on the money list's package row (owner 2026-10-28); a cancelled row is history only.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const mistake = subscription({ id: 'a', status: 'unpaid', paid: 0 });
const gone = subscription({ id: 'x', status: 'cancelled', paid: 0, student: { ...STUDENT, id: 's2', name: 'يوسف', code: 'AB-0201' } });

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(async (path: string) => {
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    if (path.startsWith('/admin-tasks')) return page([]);
    return page([mistake, gone]);
  });
  mockApiSend.mockReset().mockResolvedValue({ ...mistake, status: 'cancelled' });
});

test('only the live unpaid row offers «إلغاء الباقة»; the cancelled one shows «ملغاة»', async () => {
  await renderWithQuery(<SubscriptionsScreen />);
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.subscriptions.cancel.action })).toHaveLength(1);
  expect(screen.getAllByText(t.enums.subscriptionStatus.cancelled).length).toBeGreaterThanOrEqual(2); // the filter chip and the row
});

test('confirm with a reason → POST /subscriptions/:id/cancel', async () => {
  await renderWithQuery(<SubscriptionsScreen />);
  await screen.findByText(t.subscriptions.cancel.action);
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.action }));
  expect(screen.getByText(t.subscriptions.cancel.body)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.subscriptions.cancel.reason), ' أُنشئت بالخطأ ');
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.cancel.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/subscriptions/a/cancel', { reason: 'أُنشئت بالخطأ' }));
});
