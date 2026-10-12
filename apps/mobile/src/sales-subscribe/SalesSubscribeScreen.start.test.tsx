import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { dayLabel } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from './fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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

test('a past day only with «بدأ الاشتراك سابقًا»: a typed day, then alreadyStarted is sent', async () => {
  asSales('subscriptions.set_start_date');
  await open();
  await fireEvent(await screen.findByRole('switch', { name: m.alreadyStarted }), 'valueChange', true);
  expect(screen.queryByRole('radio', { name: t.mobile.today })).toBeNull();
  const field = screen.getByLabelText(m.startedOn);

  await fireEvent.changeText(field, '2025-01-01');
  await save();
  expect(await screen.findByText(m.error.start_date_too_old)).toBeTruthy();
  await fireEvent.changeText(field, '2026-13-01');
  expect(await screen.findByText(m.startedOnInvalid)).toBeTruthy();
  expect(sent('/sales/subscriptions')).toHaveLength(0);

  await fireEvent.changeText(field, '2026-03-15');
  await save();
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2026-03-15', alreadyStarted: true }));
});
