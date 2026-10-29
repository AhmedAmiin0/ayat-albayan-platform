import { screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { SalesSubscribeScreen } from '../screens/SalesSubscribeScreen';
import { familyOf, kid, salesQuote } from '../testing/fixtures';
import { PaymentLinksRow } from './list/PaymentLinksRow';
import { PaymentLinksScreen } from './list/PaymentLinksScreen';
import { PaymentDoneScreen } from './PaymentDoneScreen';

// The owner's hard rule (docs/30): Stripe exists only in the test build. The build flag is read first.
const mockFlag = { on: false };
jest.mock('./flag', () => ({
  get STRIPE_FEATURE() {
    return mockFlag.on;
  },
}));
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));

const ALL = [<PaymentLinksScreen key="list" />, <PaymentLinksRow key="row" />, <PaymentDoneScreen key="done" />];
const FAMILY = '/sales/money/family?phone=%2B966501112223';

/** Signed in as a salesperson (self.sales_money): the row's own permission. */
function salesClient() {
  const client = createTestQueryClient({ meFromApi: true });
  seedFullAccess(client, 'sales');
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue({ stripe: true });
});

test.each(ALL.map((ui) => [ui.key, ui]))('a normal build (flag false): %s renders nothing and asks nothing', async (_name, ui) => {
  mockFlag.on = false;
  const { toJSON } = await renderWithQuery(ui);
  expect(toJSON()).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a normal build: «اشتراك جديد» has no «طريقة الدفع» and never asks /stripe/feature', async () => {
  mockFlag.on = false;
  mockApiFetch.mockImplementation(async (path: string) => (path === FAMILY ? familyOf(kid()) : []));
  mockApiSend.mockResolvedValue(salesQuote);
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: t.salesMoney.saveSubscription })).toBeTruthy();
  expect(screen.queryByText(t.payments.method)).toBeNull();
  expect(screen.queryByRole('radio', { name: t.salesMoney.payOnline })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/stripe/feature');
  expect(mockApiSend.mock.calls.some((c: unknown[]) => String(c[1]).startsWith('/sales/payment-links'))).toBe(false);
});

test('a normal build: /pay-done (an ayatalbayan:// link) goes to the app start, never a blank screen', async () => {
  mockFlag.on = false;
  await renderWithQuery(<PaymentDoneScreen />);
  expect(mockRedirect).toHaveBeenCalledWith('/');
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('the test build on a server without Stripe (404): no row', async () => {
  mockFlag.on = true;
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'not_found' }));
  await renderWithQuery(<PaymentLinksRow />, salesClient());
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/stripe/feature'));
  expect(screen.queryByText(t.paymentLinks.list)).toBeNull();
});

test('the test build with Stripe on: the «المزيد» row shows for a salesperson', async () => {
  mockFlag.on = true;
  await renderWithQuery(<PaymentLinksRow />, salesClient());
  expect(await screen.findByText(t.paymentLinks.list)).toBeTruthy();
});
