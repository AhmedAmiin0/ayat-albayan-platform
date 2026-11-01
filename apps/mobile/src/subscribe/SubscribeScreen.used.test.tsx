import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ApiError } from '@/core/lib/http/api';
import { money } from '@/core/lib/money/format';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { balance, profile, quote, saved } from './fixtures';
import { SubscribeScreen } from './SubscribeScreen';

// «حلقات مستخدمة من الباقة» (owner 2026-10-28): the admin's package from a first day already past.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams = jest.fn((): Record<string, string> => ({ studentId: profile.id }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => mockParams(),
}));

const m = t.salesMoney;
const posted = () => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/subscriptions').at(-1)?.[2];
const save = async () =>
  fireEvent.press(await screen.findByRole('button', { name: t.inbox.subscription.make, disabled: false }));

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-02T09:00:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('/balance') ? balance(null) : profile));
  mockApiSend.mockImplementation(async (_m: string, path: string) => (path === '/subscriptions/quote' ? quote : saved('s-1')));
});
afterEach(() => jest.useRealTimers());

test('a first day from today on: no used-lessons stepper, nothing extra sent', async () => {
  await renderWithQuery(<SubscribeScreen />);
  await screen.findByText(money(180, 'SAR'));
  expect(screen.queryByText(m.usedBefore)).toBeNull();
  await save();
  await waitFor(() => expect(posted()).toMatchObject({ startsOn: '2026-10-02' }));
  expect(posted()).not.toHaveProperty('lessonsUsedBefore');
});

test('a booked first day already past: the stepper (0 … one lesson left per course day), sent above 0', async () => {
  mockParams.mockReturnValue({ studentId: profile.id, startsOn: '2026-09-28' });
  await renderWithQuery(<SubscribeScreen />);
  await screen.findByText(money(180, 'SAR'));
  expect(screen.getByText(m.usedBeforeHint)).toBeTruthy();
  for (let i = 0; i < 12; i += 1) await fireEvent.press(screen.getByRole('button', { name: m.usedBeforeMore }));
  expect(screen.getByLabelText(`${m.usedBefore}: 9`)).toBeTruthy();
  expect(screen.getByRole('button', { name: m.usedBeforeMore }).props.accessibilityState).toMatchObject({ disabled: true });
  await save();
  await waitFor(() => expect(posted()).toMatchObject({ startsOn: '2026-09-28', lessonsUsedBefore: 9 }));
});

test('the API’s used-lessons refusal in words', async () => {
  mockParams.mockReturnValue({ studentId: profile.id, startsOn: '2026-09-28' });
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/subscriptions/quote') return quote;
    throw new ApiError(403, { code: 'used_before_not_allowed' });
  });
  await renderWithQuery(<SubscribeScreen />);
  await screen.findByText(money(180, 'SAR'));
  await fireEvent.press(screen.getByRole('button', { name: m.usedBeforeMore }));
  await save();
  expect(await screen.findByText(t.packagePayment.error.used_before_not_allowed)).toBeTruthy();
});

test('without subscriptions.set_start_date: no stepper, even for a past day', async () => {
  mockParams.mockReturnValue({ studentId: profile.id, startsOn: '2026-09-28' });
  // A custom admin role without the key (the default test client holds every permission).
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { role: 'admin', permissions: [] } : path.endsWith('/balance') ? balance(null) : profile,
  );
  await renderWithQuery(<SubscribeScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(money(180, 'SAR'));
  expect(screen.queryByText(m.usedBefore)).toBeNull();
});
