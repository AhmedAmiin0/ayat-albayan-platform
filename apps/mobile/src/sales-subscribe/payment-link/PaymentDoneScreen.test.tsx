import type { PaymentLinkView, UserRole } from '@ab/shared';
import { focusManager } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { KID } from '../testing/fixtures';
import { paymentLink } from '../testing/link-fixtures';
import { PaymentDoneScreen } from './PaymentDoneScreen';

jest.mock('./flag', () => ({ STRIPE_FEATURE: true }));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockParams = { token: '', r: 'done' };
const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouter.back(),
    replace: (href: unknown) => mockRouter.replace(href),
    push: (href: unknown) => mockRouter.push(href),
    canGoBack: () => mockRouter.canGoBack(),
  },
  useLocalSearchParams: () => mockParams,
}));

const pl = t.paymentLinks;
const TOKEN = 'p'.repeat(32);
const mine = (fields: Partial<PaymentLinkView> = {}) => paymentLink({ url: `https://api.example.test/pay/${TOKEN}`, ...fields });
const listCalls = () => mockApiFetch.mock.calls.filter((c: unknown[]) => c[0] === '/sales/payment-links').length;

/** GET /sales/payment-links answers each list in turn (the last one from then on). */
function answer(...lists: PaymentLinkView[][]) {
  let next = 0;
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/stripe/feature') return { stripe: true };
    if (path !== '/sales/payment-links') return null;
    next += 1;
    return lists[Math.min(next, lists.length) - 1];
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockParams, { token: TOKEN, r: 'done' });
  mockRouter.canGoBack.mockReturnValue(true);
});
afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
});

test('back before the webhook: «جارٍ تأكيد الدفع…», then «تم الدفع» with her student (from our API); then it stops asking', async () => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  answer([mine()], [mine({ status: 'paid', paid_at: '2026-10-29T09:00:00.000Z' })]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.mobile.confirming)).toBeTruthy();
  expect(screen.getByText('ريم')).toBeTruthy();
  expect(screen.queryByRole('button', { name: new RegExp(pl.cancel) })).toBeNull();
  await act(() => jest.advanceTimersByTimeAsync(2100));
  expect(await screen.findByText(pl.status.paid)).toBeTruthy();
  expect(screen.getByText(pl.mobile.paid)).toBeTruthy();
  expect(screen.queryByText(pl.pay.doneTitle)).toBeNull();
  expect(screen.queryByText(pl.mobile.confirming)).toBeNull();
  const asked = listCalls();
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(listCalls()).toBe(asked);
});

test('no webhook within a minute: «لم يصل تأكيد الدفع بعد» and «تحديث», which asks at once and waits again', async () => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  answer([mine()]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.mobile.confirming)).toBeTruthy();
  expect(screen.queryByRole('button', { name: pl.mobile.refresh })).toBeNull();
  await act(() => jest.advanceTimersByTimeAsync(60_100));
  expect(screen.getByText(pl.mobile.notConfirmed)).toBeTruthy();
  const asked = listCalls();
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(listCalls()).toBe(asked);
  answer([mine({ status: 'paid', paid_at: '2026-10-29T09:05:00.000Z' })]);
  await fireEvent.press(screen.getByRole('button', { name: pl.mobile.refresh }));
  expect(await screen.findByText(pl.mobile.paid)).toBeTruthy();
  expect(listCalls()).toBe(asked + 1);
  expect(screen.queryByText(pl.mobile.notConfirmed)).toBeNull();
});

test('a token that is not among her links: not found, nothing of another family shown', async () => {
  answer([paymentLink()]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.pay.notFound)).toBeTruthy();
  expect(screen.queryByText('ريم')).toBeNull();
});

test('back from a cancelled checkout: «لم يتم الدفع» on the open link, no «confirming», no polling; «رجوع» goes back', async () => {
  mockParams.r = 'cancelled';
  answer([mine()]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.status.open)).toBeTruthy();
  expect(screen.getByText(pl.pay.cancelTitle)).toBeTruthy();
  expect(screen.queryByText(pl.mobile.confirming)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(listCalls()).toBe(1);
});

test.each<[UserRole, string]>([
  ['admin', ''],
  ['sales', '/sales'],
])('%s: «فتح ملف الطالب» opens the student in her tree (it reaches the chat); after a cold start «رجوع» opens her inbox', async (role, base) => {
  mockRouter.canGoBack.mockReturnValue(false);
  answer([mine({ status: 'paid' })]);
  const client = createTestQueryClient({ meFromApi: true });
  seedFullAccess(client, role);
  await renderWithQuery(<PaymentDoneScreen />, client);
  await fireEvent.press(await screen.findByRole('button', { name: pl.mobile.openStudent }));
  expect(mockRouter.push).toHaveBeenCalledWith(`${base}/inbox/student/${KID}`);
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockRouter.replace).toHaveBeenCalledWith(`${base}/inbox`);
});
