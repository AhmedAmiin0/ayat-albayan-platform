import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID, kid, openSub, PHONE, salesQuote } from '@/sales-subscribe/testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// «مبلغ مخصص» on the package price of «تحويل بنكي» (owner 2026-11-02): new and renewal.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));

const c = t.subscriptions.customPrice;
const LABEL = new RegExp(c.label.split(' (')[0] ?? '');
const PREMIUM = { pkg: 'premium', count: 10, duration: 60, discount: 10, country: 'AE' } as const;
const saves = () =>
  mockApiSend.mock.calls.filter((call: unknown[]) => call[1] === '/sales/subscriptions').map((call: unknown[]) => call[2]);
const toggle = () => fireEvent.press(screen.getByRole('checkbox', { name: t.paymentLinks.customAmount }));
const save = async () =>
  fireEvent.press(await screen.findByRole('button', { name: t.salesMoney.saveSubscription, disabled: false }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { phone: PHONE, studentId: KID };
  mockApiFetch.mockResolvedValue(familyOf(kid()));
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/subscriptions/quote' ? salesQuote : openSub(),
  );
});

test('off: today’s body, no customPrice', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  await save();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).not.toHaveProperty('customPrice');
  expect(screen.queryByLabelText(LABEL)).toBeNull();
});

test('on: «سعر الباقة» starts from the quote; the typed price is sent', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  await screen.findByRole('button', { name: t.salesMoney.saveSubscription, disabled: false });
  await toggle();
  expect(screen.getByLabelText(LABEL).props.value).toBe('180');
  await fireEvent.changeText(screen.getByLabelText(LABEL), '160');
  await save();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).toMatchObject({ studentId: KID, customPrice: 160 });
});

test('«جدّد الاشتراك»: the renewal sends the custom price with its last package', async () => {
  mockParams.current = { phone: PHONE, studentId: KID, renew: '1' };
  mockApiFetch.mockResolvedValue(familyOf(kid({ status: 'expired', renew_due: true, renewal: PREMIUM })));
  await renderWithQuery(<SalesSubscribeScreen />);
  await screen.findByRole('button', { name: t.salesMoney.saveSubscription, disabled: false });
  await toggle();
  await fireEvent.changeText(screen.getByLabelText(LABEL), '170');
  await save();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).toMatchObject({ pricing: { tier: 'premium', duration: 60 }, customPrice: 170 });
});

test('below the admin’s lowest amount: the API’s refusal is said', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/sales/subscriptions') throw new ApiError(400, { code: 'discount_too_large', min: 150 });
    return salesQuote;
  });
  await renderWithQuery(<SalesSubscribeScreen />);
  await screen.findByRole('button', { name: t.salesMoney.saveSubscription, disabled: false });
  await toggle();
  await fireEvent.changeText(screen.getByLabelText(LABEL), '100');
  await save();
  expect(await screen.findByText(t.paymentLinks.error.discount_too_large)).toBeTruthy();
});
