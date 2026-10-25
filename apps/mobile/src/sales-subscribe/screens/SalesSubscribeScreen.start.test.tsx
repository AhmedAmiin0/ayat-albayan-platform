import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { dayLabel } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { localDay, money } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from '../testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223', tz: 'Asia/Riyadh' }),
}));

const m = t.salesMoney;
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const lastBody = () => sent('/sales/subscriptions').at(-1)?.[2] as Record<string, unknown> | undefined;

function asSales(...permissions: string[]) {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { role: 'sales', permissions: ['self.sales_money', ...permissions] } : familyOf(kid()),
  );
}
async function open() {
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
}
const save = async () => fireEvent.press(await screen.findByRole('button', { name: m.saveSubscription, disabled: false }));

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-12T09:00:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/subscriptions/quote' ? salesQuote : openSub(),
  );
});
afterEach(() => jest.useRealTimers());

test('without subscriptions.set_start_date: no day picker, «تبدأ الباقة اليوم», the body has no startsOn', async () => {
  asSales();
  await open();
  const today = dayLabel(new Date('2026-10-12T12:00:00Z'));
  expect(screen.getByText(m.startsOnDefault.replace('{date}', today))).toBeTruthy();
  expect(screen.queryByRole('radio', { name: t.mobile.today })).toBeNull();
  expect(screen.queryByRole('switch', { name: m.alreadyStarted })).toBeNull();
  await save();
  await waitFor(() => expect(lastBody()).toBeDefined());
  expect(lastBody()).not.toHaveProperty('startsOn');
  expect(lastBody()).not.toHaveProperty('alreadyStarted');
});

test('with it: the day chips (today on, no past day), sent as startsOn without alreadyStarted', async () => {
  asSales('subscriptions.set_start_date');
  await open();
  expect(await screen.findByRole('radio', { name: t.mobile.today, checked: true })).toBeTruthy();
  expect(screen.queryByText(m.startsOnDefault.split('(')[0] ?? '')).toBeNull();
  await save();
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2026-10-12' }));
  expect(lastBody()).not.toHaveProperty('alreadyStarted');
});

test('a past day only with «بدأ الاشتراك سابقًا»: picked with steppers (never typed), then alreadyStarted is sent', async () => {
  asSales('subscriptions.set_start_date');
  await open();
  await fireEvent(await screen.findByRole('switch', { name: m.alreadyStarted }), 'valueChange', true);
  expect(screen.queryByRole('radio', { name: t.mobile.today })).toBeNull();
  expect(screen.getByText(m.startedOn)).toBeTruthy();
  expect(screen.queryByLabelText(m.startedOn)).toBeNull();
  expect(screen.queryByDisplayValue('2026-10-12')).toBeNull();
  expect(screen.queryByPlaceholderText('2026-10-12')).toBeNull();
  expect(screen.getByRole('button', { name: t.payments.mobile.dayAfter, disabled: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobileSalesMoney.monthAfter, disabled: true })).toBeTruthy();

  for (let i = 0; i < 14; i += 1) await fireEvent.press(screen.getByRole('button', { name: t.mobileSalesMoney.monthBefore }));
  expect(screen.getByRole('button', { name: t.payments.mobile.dayBefore, disabled: true })).toBeTruthy();
  expect(screen.getByText(localDay('2025-10-12'))).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: t.mobileSalesMoney.monthAfter }));
  await fireEvent.press(screen.getByRole('button', { name: t.payments.mobile.dayAfter }));
  await save();
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2025-11-13', alreadyStarted: true }));
  expect(screen.queryByText(m.error.start_date_too_old)).toBeNull();
});
