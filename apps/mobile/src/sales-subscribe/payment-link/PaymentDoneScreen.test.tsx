import type { PaymentLinkView, UserRole } from '@ab/shared';
import { focusManager } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { paymentLink } from '../testing/link-fixtures';
import { PaymentDoneScreen } from './PaymentDoneScreen';

jest.mock('./flag', () => ({ STRIPE_FEATURE: true }));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockParams = { token: '', r: 'done' };
const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  router: { back: () => mockRouter.back(), replace: (href: unknown) => mockRouter.replace(href), canGoBack: () => mockRouter.canGoBack() },
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

test('back before the webhook: «جارٍ تأكيد الدفع…», then paid with her student (from our API); then it stops asking', async () => {
  jest.useFakeTimers();
  focusManager.setFocused(true);
  answer([mine()], [mine({ status: 'paid', paid_at: '2026-10-29T09:00:00.000Z' })]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.mobile.confirming)).toBeTruthy();
  expect(screen.getByText('ريم')).toBeTruthy();
  expect(screen.queryByRole('button', { name: new RegExp(pl.cancel) })).toBeNull();
  await act(() => jest.advanceTimersByTimeAsync(2100));
  expect(await screen.findByText(pl.status.paid)).toBeTruthy();
  expect(screen.getByText(pl.pay.doneTitle)).toBeTruthy();
  expect(screen.queryByText(pl.mobile.confirming)).toBeNull();
  const asked = listCalls();
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(listCalls()).toBe(asked);
});

test('a token that is not among her links: not found, nothing of another family shown', async () => {
  answer([paymentLink()]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.pay.notFound)).toBeTruthy();
  expect(screen.queryByText('ريم')).toBeNull();
});

test('back from a cancelled checkout: the open link, no «confirming», no polling; «رجوع» goes back', async () => {
  mockParams.r = 'cancelled';
  answer([mine()]);
  await renderWithQuery(<PaymentDoneScreen />);
  expect(await screen.findByText(pl.status.open)).toBeTruthy();
  expect(screen.queryByText(pl.mobile.confirming)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(listCalls()).toBe(1);
});

test.each<[UserRole, string]>([
  ['admin', '/inbox'],
  ['sales', '/sales/inbox'],
])('after a cold start (%s, nothing to go back to) «رجوع» opens %s', async (role, inbox) => {
  mockRouter.canGoBack.mockReturnValue(false);
  answer([mine()]);
  const client = createTestQueryClient({ meFromApi: true });
  seedFullAccess(client, role);
  await renderWithQuery(<PaymentDoneScreen />, client);
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockRouter.replace).toHaveBeenCalledWith(inbox);
});
