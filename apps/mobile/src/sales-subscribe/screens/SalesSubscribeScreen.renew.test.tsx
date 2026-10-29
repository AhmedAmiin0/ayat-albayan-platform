import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID, KID2, kid, PHONE, salesQuote } from '../testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

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

const p = t.pricing;
const PREMIUM = { pkg: 'premium', count: 10, duration: 60, discount: 10, country: 'AE' } as const;
const CUSTOM = { pkg: 'custom', count: 14, duration: 30, discount: 5, country: '' } as const;
const lastQuote = () => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/sales/subscriptions/quote').at(-1)?.[2];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(salesQuote);
  mockApiFetch.mockResolvedValue(
    familyOf(kid({ status: 'expired', renew_due: true, renewal: PREMIUM }), kid({ id: KID2, name: 'سلمى', status: 'active', renew_due: true, renewal: CUSTOM })),
  );
});

test('«جدّد الاشتراك»: titled as a renewal, the form prefilled from her last package, still editable', async () => {
  mockParams.current = { phone: PHONE, studentId: KID, renew: '1' };
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('header', { name: t.students.renew })).toBeTruthy();
  expect(screen.getByRole('radio', { name: p.packages.premium.sessions, checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: p.discounts['10'], checked: true })).toBeTruthy();
  await waitFor(() => expect(lastQuote()).toEqual({ studentId: KID, pricing: { tier: 'premium', duration: 60, discount: 10, country: 'AE' } }));
  await fireEvent.press(screen.getByRole('radio', { name: p.discounts['0'] }));
  await waitFor(() => expect(lastQuote()).toMatchObject({ pricing: { discount: 0 } }));
});

test('another child picked on a renewal: the form follows that child’s last package', async () => {
  mockParams.current = { phone: PHONE, studentId: KID, renew: '1' };
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('radio', { name: /سلمى/ }));
  await waitFor(() => expect(lastQuote()).toEqual({ studentId: KID2, pricing: { count: 14, duration: 30, discount: 5 } }));
});

test('«اشتراك جديد» (no renew): the empty calculator, whatever her last package was', async () => {
  mockParams.current = { phone: PHONE, studentId: KID };
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('header', { name: t.salesMoney.newSubscription })).toBeTruthy();
  await waitFor(() => expect(lastQuote()).toEqual({ studentId: KID, pricing: { tier: 'standard', duration: 45, discount: 0 } }));
});

test('the one «جدّد الاشتراك» with several children (no studentId): all hers listed; only the due one is prefilled and titled a renewal', async () => {
  mockApiFetch.mockResolvedValue(familyOf(kid({ status: 'expired', renew_due: true, renewal: PREMIUM }), kid({ id: KID2, name: 'سلمى', status: 'active', renewal: CUSTOM })));
  mockParams.current = { phone: PHONE, renew: '1' };
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('header', { name: t.students.renew })).toBeTruthy();
  await fireEvent.press(await screen.findByRole('radio', { name: /ريم/ }));
  await waitFor(() => expect(lastQuote()).toEqual({ studentId: KID, pricing: { tier: 'premium', duration: 60, discount: 10, country: 'AE' } }));
  expect(screen.getByRole('header', { name: t.students.renew })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /سلمى/ }));
  await waitFor(() => expect(lastQuote()).toEqual({ studentId: KID2, pricing: { tier: 'standard', duration: 45, discount: 0 } }));
  // A sibling not due gets a new package: the title says so.
  expect(screen.getByRole('header', { name: t.salesMoney.newSubscription })).toBeTruthy();
});
