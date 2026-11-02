import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { referenceLine } from '@/sales-subscribe/payment-link/link-text';
import { familyOf, kid, salesQuote } from '@/sales-subscribe/testing/fixtures';
import { linkQuote, paymentLink } from '@/sales-subscribe/testing/link-fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// «مبلغ مخصص» beside the discount pills (owner 2026-11-01), «دفع إلكتروني» in the Stripe build.
jest.mock('@/sales-subscribe/payment-link/flag', () => ({ STRIPE_FEATURE: true }));
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

const pl = t.paymentLinks;
const LABEL = new RegExp(pl.agreedAmount.split(' (')[0] ?? '');
const created = () => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/sales/payment-links').map((c: unknown[]) => c[2]);
const toggle = () => fireEvent.press(screen.getByRole('checkbox', { name: pl.customAmount }));
const make = () => fireEvent.press(screen.getByRole('button', { name: pl.create }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => (path === '/stripe/feature' ? { stripe: true } : familyOf(kid())));
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payment-links/quote' ? linkQuote() : path === '/sales/subscriptions/quote' ? salesQuote : paymentLink(),
  );
});

async function online() {
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('radio', { name: t.salesMoney.payOnline }));
  expect(await screen.findByText(referenceLine(180, 'SAR'))).toBeTruthy();
  await screen.findByRole('button', { name: pl.create, disabled: false });
}

test('off (the default): no amount field, and the link carries the calculator price after the pill', async () => {
  await online();
  expect(screen.getByRole('checkbox', { name: pl.customAmount, checked: false })).toBeTruthy();
  expect(screen.queryByLabelText(LABEL)).toBeNull();
  await make();
  await waitFor(() => expect(created()).toHaveLength(1));
  expect(created()[0]).toMatchObject({ amount: 180, currency: 'SAR' });
});

test('on: the field appears and its amount is the one sent', async () => {
  await online();
  await toggle();
  await fireEvent.changeText(screen.getByLabelText(LABEL), '175');
  await make();
  await waitFor(() => expect(created()).toHaveLength(1));
  expect(created()[0]).toMatchObject({ amount: 175 });
});

test('switching it off drops the typed amount: the price is sent, and on again starts from the price', async () => {
  await online();
  await toggle();
  await fireEvent.changeText(screen.getByLabelText(LABEL), '175');
  await toggle();
  expect(screen.queryByLabelText(LABEL)).toBeNull();
  await toggle();
  expect(screen.getByLabelText(LABEL).props.value).toBe('180');
  await toggle();
  await make();
  await waitFor(() => expect(created()).toHaveLength(1));
  expect(created()[0]).toMatchObject({ amount: 180 });
});

test('the API’s cap refusal is said in the form', async () => {
  await online();
  await toggle();
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/sales/payment-links') throw new ApiError(400, { code: 'discount_too_large' });
    return path === '/sales/payment-links/quote' ? linkQuote() : salesQuote;
  });
  await make();
  expect(await screen.findByText(pl.error.discount_too_large)).toBeTruthy();
});
