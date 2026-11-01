import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/core/lib/money/format';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from '@/sales-subscribe/testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// «حلقات مستخدمة من الباقة» (owner 2026-10-28): only with «بدأ الاشتراك سابقًا», − / + from 0 to one lesson left per course day.
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
const lastBody = () =>
  mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/sales/subscriptions').at(-1)?.[2] as Record<string, unknown> | undefined;
const shown = (n: number) => screen.getByLabelText(`${m.usedBefore}: ${n}`);
const more = () => screen.getByRole('button', { name: m.usedBeforeMore });
const press = async (name: string, times = 1) => {
  for (let i = 0; i < times; i += 1) await fireEvent.press(screen.getByRole('button', { name }));
};
const switchTo = async (on: boolean) => fireEvent(await screen.findByRole('switch', { name: m.alreadyStarted }), 'valueChange', on);

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-12T09:00:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { role: 'sales', permissions: ['self.sales_money', 'subscriptions.set_start_date'] } : familyOf(kid()),
  );
  // 12 lessons for the default package, 4 for the weekly one.
  mockApiSend.mockImplementation(async (_m: string, path: string, body: { pricing?: { tier?: string } }) => {
    if (path !== '/sales/subscriptions/quote') return openSub();
    return body.pricing?.tier === 'weekly' ? { ...salesQuote, package: 'weekly', lessons: 4, afterDiscount: 60 } : salesQuote;
  });
});
afterEach(() => jest.useRealTimers());

async function open() {
  await renderWithQuery(<SalesSubscribeScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
}

test('only with the switch on, from 0 with its note; off again resets it to 0', async () => {
  await open();
  expect(screen.queryByText(m.usedBefore)).toBeNull();
  await switchTo(true);
  expect(screen.getByText(m.usedBefore)).toBeTruthy();
  expect(screen.getByText(m.usedBeforeHint)).toBeTruthy();
  expect(shown(0)).toBeTruthy();
  expect(screen.getByRole('button', { name: m.usedBeforeLess }).props.accessibilityState).toMatchObject({ disabled: true });
  await press(m.usedBeforeMore, 2);
  expect(shown(2)).toBeTruthy();
  await switchTo(false);
  expect(screen.queryByText(m.usedBefore)).toBeNull();
  await switchTo(true);
  expect(shown(0)).toBeTruthy();
});

const saveWith = async (used: number) => {
  await open();
  await switchTo(true);
  await press(t.payments.mobile.dayBefore);
  await press(m.usedBeforeMore, used);
  await fireEvent.press(await screen.findByRole('button', { name: m.saveSubscription, disabled: false }));
  await waitFor(() => expect(lastBody()).toMatchObject({ startsOn: '2026-10-11', alreadyStarted: true }));
};

test('a past day and 1 used: the body carries lessonsUsedBefore', async () => {
  await saveWith(1);
  expect(lastBody()).toMatchObject({ lessonsUsedBefore: 1 });
});

test('0 used is never sent', async () => {
  await saveWith(0);
  expect(lastBody()).not.toHaveProperty('lessonsUsedBefore');
});

test('stops at one lesson left per course day (+ disabled), and a smaller package clamps it', async () => {
  await open();
  await switchTo(true);
  await press(m.usedBeforeMore, 12);
  expect(shown(9)).toBeTruthy();
  expect(more().props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(screen.getByRole('radio', { name: t.pricing.packages.weekly.sessions }));
  expect(await screen.findByText(money(60, 'SAR'))).toBeTruthy();
  expect(shown(3)).toBeTruthy();
  expect(more().props.accessibilityState).toMatchObject({ disabled: true });
});
