import { screen, waitFor, fireEvent } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from './fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// Regression: the default day and the chips are the academy's (Riyadh) day, the one the API checks,
// not the family's. A London family after Riyadh midnight: «اليوم» is already the 13th.

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+447700900123', tz: 'Europe/London' }),
}));

const m = t.salesMoney;
const lastBody = () =>
  mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/sales/subscriptions').at(-1)?.[2] as Record<string, unknown> | undefined;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-12T21:30:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me'
      ? { role: 'sales', permissions: ['self.sales_money', 'subscriptions.set_start_date'] }
      : familyOf(kid()),
  );
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/subscriptions/quote' ? salesQuote : openSub(),
  );
});
afterEach(() => jest.useRealTimers());

test('a London family at 21:30 UTC: «اليوم» is Riyadh 2026-10-13 and is accepted', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
  expect(await screen.findByRole('radio', { name: t.mobile.today, checked: true })).toBeTruthy();
  fireEvent.press(await screen.findByRole('button', { name: m.saveSubscription, disabled: false }));
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2026-10-13' }));
  expect(screen.queryByText(m.error.start_date_past)).toBeNull();
});
