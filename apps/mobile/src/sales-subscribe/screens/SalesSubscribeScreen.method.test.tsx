import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from '../testing/fixtures';
import { linkQuote } from '../testing/link-fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// «طريقة الدفع» (owner 2026-10-29): «تحويل بنكي» or «دفع إلكتروني», inside «اشتراك جديد» (the Stripe test build).
jest.mock('../payment-link/flag', () => ({ STRIPE_FEATURE: true }));
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: (h: unknown) => mockReplace(h), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));

const m = t.salesMoney;
const posted = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const serve = (child = kid()) =>
  mockApiFetch.mockImplementation(async (path: string) => (path === '/stripe/feature' ? { stripe: true } : familyOf(child)));

beforeEach(() => {
  jest.clearAllMocks();
  serve();
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payment-links/quote' ? linkQuote() : path === '/sales/subscriptions/quote' ? salesQuote : openSub(),
  );
});

test('her own child: two methods, «تحويل بنكي» first and picked; saving is today’s package, then its weekly days', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('radio', { name: t.enums.paymentMethod.bank, checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: m.payOnline, checked: false })).toBeTruthy();
  expect(screen.getByText(t.payments.method)).toBeTruthy();
  await fireEvent.press(await screen.findByRole('button', { name: m.saveSubscription, disabled: false }));
  await waitFor(() => expect(posted('/sales/subscriptions')).toHaveLength(1));
  expect(posted('/sales/payment-links')).toHaveLength(0);
  expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ pathname: expect.stringContaining('/inbox/sales-course') }));
});

test('«دفع إلكتروني»: the amount to transfer gives way to the reference and the agreed amount; the button makes the link', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByText(m.price)).toBeTruthy();
  await fireEvent.press(await screen.findByRole('radio', { name: m.payOnline }));
  expect(await screen.findByLabelText(new RegExp(t.paymentLinks.agreedAmount.split(' (')[0] ?? ''))).toBeTruthy();
  expect(screen.queryByText(m.price)).toBeNull();
  expect(screen.getByRole('button', { name: t.paymentLinks.create })).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.saveSubscription })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.bank }));
  expect(await screen.findByText(m.price)).toBeTruthy();
});

test('a child listed through sales.renew_any (mine: false): bank transfer only, no method to pick', async () => {
  serve(kid({ mine: false }));
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: m.saveSubscription })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/stripe/feature'));
  expect(screen.queryByText(t.payments.method)).toBeNull();
  expect(screen.queryByRole('radio', { name: m.payOnline })).toBeNull();
});

test('the server without Stripe (404): no method to pick', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/stripe/feature') throw new ApiError(404, { code: 'not_found' });
    return familyOf(kid());
  });
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: m.saveSubscription })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/stripe/feature'));
  expect(screen.queryByText(t.payments.method)).toBeNull();
});
