import { quote, type StudentStatus } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { balanceOf, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { StudentScreen } from './StudentScreen';
import { profile } from '../shared/test-data';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (mockHref: unknown) => mockPush(mockHref), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

function serve(status: StudentStatus, balance?: unknown) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/students/s1') return { ...profile, status };
    if (path === '/students/s1/balance' && balance) return balance;
    throw new ApiError(404);
  });
}
const renew = () => screen.queryByRole('button', { name: t.students.renew });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test.each(['pending_renewal', 'expired'] as const)('%s: «جدّد الاشتراك» opens the subscribe screen prefilled from the last package', async (status) => {
  const source = { ...quote({ count: 14, duration: 60, country: 'AE', students: 1, discount: 10 }), fx: null };
  serve(status, balanceOf(subscription({ package: null, duration: 60, lessons_total: 14, price_source: source })));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/balance'));
  await screen.findByText(t.subscriptions.balance);
  await fireEvent.press(await screen.findByRole('button', { name: t.students.renew }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/students/subscribe',
    params: { studentId: 's1', renew: '1', plan: 'custom', count: '14', minutes: '60', discount: '10', country: 'AE' },
  });
});

test('off until the last package loads, so it never opens on the defaults', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/students/s1' ? { ...profile, status: 'expired' } : new Promise(() => undefined),
  );
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  const button = await screen.findByRole('button', { name: t.students.renew });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(button);
  expect(mockPush).not.toHaveBeenCalled();
});

test.each(['new', 'trial', 'pending_subscription', 'active', 'paused', 'churned'] as const)('%s: no «جدّد الاشتراك»', async (status) => {
  serve(status, balanceOf(subscription()));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await screen.findByText(t.subscriptions.balance);
  expect(renew()).toBeNull();
});
