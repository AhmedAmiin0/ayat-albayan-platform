import { screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { PHONE } from '../testing/fixtures';
import { PaymentLinksRow } from './list/PaymentLinksRow';
import { PaymentLinksScreen } from './list/PaymentLinksScreen';
import { PaymentLinkPill } from './PaymentLinkPill';
import { PaymentLinkScreen } from './PaymentLinkScreen';

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
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));

const ALL = [
  <PaymentLinkPill key="pill" phone={PHONE} />,
  <PaymentLinkScreen key="screen" />,
  <PaymentLinksScreen key="list" />,
  <PaymentLinksRow key="row" />,
];

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

test('the test build on a server without Stripe (404): no pill, no row', async () => {
  mockFlag.on = true;
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'not_found' }));
  await renderWithQuery(
    <>
      <PaymentLinkPill phone={PHONE} />
      <PaymentLinksRow />
    </>,
    salesClient(),
  );
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/stripe/feature'));
  expect(screen.queryByRole('button', { name: t.paymentLinks.action })).toBeNull();
  expect(screen.queryByText(t.paymentLinks.list)).toBeNull();
});

test('the test build with Stripe on: the pill and, for a salesperson, the «المزيد» row show', async () => {
  mockFlag.on = true;
  await renderWithQuery(
    <>
      <PaymentLinkPill phone={PHONE} />
      <PaymentLinksRow />
    </>,
    salesClient(),
  );
  expect(await screen.findByRole('button', { name: t.paymentLinks.action })).toBeTruthy();
  expect(await screen.findByText(t.paymentLinks.list)).toBeTruthy();
});
