import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { balanceOf, page, payment, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { BalanceCard } from './BalanceCard';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const left = (remaining: number) =>
  balanceOf(
    subscription({
      status: 'active',
      paid: 145,
      balance: { ...subscription().balance, lessons_used: 4 - remaining, remaining },
    }),
  );

/** GET /students/s1/balance, /settings and /payments, as the card asks for them. */
function serve(balance: unknown, threshold = 2) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/students/s1/balance') return balance;
    if (path === '/settings') return { renewal_alert_remaining: threshold };
    if (path.startsWith('/payments?')) return page([payment()]);
    throw new ApiError(404);
  });
}

beforeEach(() => jest.clearAllMocks());

const colorOf = (text: string) => {
  const style: unknown = screen.getByText(text).props.style;
  return (Array.isArray(style) ? Object.assign({}, ...style) : style).color as string;
};

test('3 left: ink, the package, what is used and paid, the status, «سجّل دفعة»', async () => {
  serve(left(3));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText('بقيت 3 حلقات')).toBeTruthy();
  expect(colorOf('بقيت 3 حلقات')).toBe(palette.light.ink);
  expect(screen.getByText(`${t.enums.packageSize['4']} · 1 من 4 حلقة`)).toBeTruthy();
  expect(screen.getByText(/دُفع /)).toBeTruthy();
  expect(screen.getByText(t.enums.subscriptionStatus.active)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.payments.mobile.record }));
  expect(mockPush).toHaveBeenCalledWith('/students/payment/s1');
});

test('2 left (the renewal threshold): saffron «بقيت حلقتان»', async () => {
  serve(left(2));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText('بقيت حلقتان')).toBeTruthy();
  expect(colorOf('بقيت حلقتان')).toBe(palette.light.act);
});

test('the threshold comes from the settings', async () => {
  serve(left(3), 3);
  await renderWithQuery(<BalanceCard studentId="s1" />);
  await screen.findByText(t.payments.title);
  expect(colorOf('بقيت 3 حلقات')).toBe(palette.light.act);
});

test('the latest payments under the card', async () => {
  serve(left(3));
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(t.payments.title)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/payments?studentId=s1&pageSize=5');
  expect(screen.getByText(`${t.enums.paymentMethod.bank} · 29 سبتمبر 2026`)).toBeTruthy();
});

test('no package: says so, no payment action, no payments list', async () => {
  serve(balanceOf());
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(t.subscriptions.empty)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.payments.mobile.record })).toBeNull();
  expect(screen.queryByText(t.payments.title)).toBeNull();
});

test('the balance cannot be read (and nothing is cached): no card at all', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(404));
  const { client } = await renderWithQuery(<BalanceCard studentId="s1" />);
  await waitFor(() => expect(client.getQueryState(['students', 's1', 'balance'])?.status).toBe('error'));
  expect(screen.queryByText(t.subscriptions.balance)).toBeNull();
});
