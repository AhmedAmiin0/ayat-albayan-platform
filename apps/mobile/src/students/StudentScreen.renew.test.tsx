import type { StudentStatus } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { balanceOf, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { StudentScreen } from './StudentScreen';
import { profile } from './test-data';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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
  serve(status, balanceOf(subscription({ package: '8', duration: 60 })));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/balance'));
  await screen.findByText(t.subscriptions.balance);
  await fireEvent.press(await screen.findByRole('button', { name: t.students.renew }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/students/subscribe',
    params: { studentId: 's1', renew: '1', pkg: '8', minutes: '60' },
  });
});

test.each(['new', 'trial', 'pending_subscription', 'active', 'paused', 'churned'] as const)('%s: no «جدّد الاشتراك»', async (status) => {
  serve(status, balanceOf(subscription()));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await screen.findByText(t.subscriptions.balance);
  expect(renew()).toBeNull();
});
