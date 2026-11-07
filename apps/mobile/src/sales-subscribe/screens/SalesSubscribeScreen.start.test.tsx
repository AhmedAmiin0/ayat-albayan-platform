import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { dayLabel } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { dayOf, dialogProps, pickDay } from '@/test/pickers/native-picker';
import { localDay, money } from '@/core/lib/money/format';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from '@/sales-subscribe/testing/fixtures';
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
  await renderWithQuery(<SalesSubscribeScreen />, createTestQueryClient({ meFromApi: true }));
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
  const today = dayLabel(new Date('2026-10-12T12:00:00Z'), 'UTC');
  expect(screen.getByText(m.startsOnDefault.replace('{date}', today))).toBeTruthy();
  expect(screen.queryByTestId('start-day-open')).toBeNull();
  expect(screen.queryByRole('switch', { name: m.alreadyStarted })).toBeNull();
  await save();
  await waitFor(() => expect(lastBody()).toBeDefined());
  expect(lastBody()).not.toHaveProperty('startsOn');
  expect(lastBody()).not.toHaveProperty('alreadyStarted');
});

test('with it: the date dialog (today on, no past day), sent as startsOn without alreadyStarted', async () => {
  asSales('subscriptions.set_start_date');
  await open();
  await fireEvent.press(await screen.findByTestId('start-day-open'));
  const bounds = await dialogProps();
  expect([dayOf(bounds.minimumDate), dayOf(bounds.maximumDate)]).toEqual(['2026-10-12', '2026-10-18']);
  await act(() => bounds.onValueChange({}, new Date(2026, 9, 12, 12)));
  expect(screen.queryByText(m.startsOnDefault.split('(')[0] ?? '')).toBeNull();
  await save();
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2026-10-12' }));
  expect(lastBody()).not.toHaveProperty('alreadyStarted');
});

test('a past day only with «بدأ الاشتراك سابقًا»: picked on the calendar (never typed), then alreadyStarted is sent', async () => {
  asSales('subscriptions.set_start_date');
  await open();
  await fireEvent(await screen.findByRole('switch', { name: m.alreadyStarted }), 'valueChange', true);
  expect(screen.queryByTestId('start-day-open')).toBeNull();
  expect(screen.getByText(m.startedOn)).toBeTruthy();
  expect(screen.queryByDisplayValue('2026-10-12')).toBeNull();
  expect(screen.getByText(t.datePicker.earliest.replace('{date}', localDay('2025-10-12')))).toBeTruthy();

  await pickDay('date-picker-open', '2025-11-13');
  expect(screen.queryByTestId('native-date-time-picker')).toBeNull();
  expect(screen.getByText(localDay('2025-11-13'))).toBeTruthy();
  await save();
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2025-11-13', alreadyStarted: true }));
  expect(screen.queryByText(m.error.start_date_too_old)).toBeNull();
});

test('the past-day dialog stops a year back and at today (the API’s bounds)', async () => {
  asSales('subscriptions.set_start_date');
  await open();
  await fireEvent(await screen.findByRole('switch', { name: m.alreadyStarted }), 'valueChange', true);
  await fireEvent.press(screen.getByTestId('date-picker-open'));
  const bounds = await dialogProps();
  expect([dayOf(bounds.minimumDate), dayOf(bounds.maximumDate)]).toEqual(['2025-10-12', '2026-10-12']);
});
