import type { NotificationItem } from '@ab/shared';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { commissionDay, commissionLine } from '../lib/money-text';
import { commissionPage, earnings, myCommission } from '../testing/fixtures';
import { MyWalletView } from './MyWalletView';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const W = t.assistantPortal.wallet;
const bellRow = (id: string): NotificationItem =>
  ({ id, kind: 'commission_earned', title: '', body: '', data: {}, created_at: '2026-10-29T16:42:15Z', read_at: null });
let bell: NotificationItem[] = [];

function serve(rows = [myCommission()], over: { wallet?: object; total?: number; earningsDown?: boolean } = {}) {
  mockApiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/sales/me/commissions')) {
      // Each page answers as itself, so the list knows when it has them all.
      const page = Number(/page=(\d+)/.exec(path)?.[1] ?? 1);
      return Promise.resolve(commissionPage(page === 1 ? rows : [], over.total ?? rows.length, page));
    }
    if (path.startsWith('/me/notifications')) return Promise.resolve({ items: bell, total: bell.length, page: 1, pageSize: 20, unread: 0 });
    if (over.earningsDown) return Promise.reject(new Error('down'));
    return Promise.resolve(earnings(over.wallet ? { wallet: over.wallet as never } : {}));
  });
}
const calls = (prefix: string) => mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

beforeEach(() => {
  mockApiFetch.mockReset();
  bell = [];
});

test('the balance per currency: owed, this month and paid, never summed across currencies', async () => {
  serve();
  await renderWithQuery(<MyWalletView />);
  const egp = await screen.findByTestId('wallet-EGP');
  expect(egp).toHaveTextContent(new RegExp(W.due));
  expect(egp).toHaveTextContent(/50/);
  expect(egp).toHaveTextContent(/40/);
  expect(screen.getByTestId('wallet-SAR')).toHaveTextContent(/75/);
  expect(screen.queryByText(/125/)).toBeNull();
});

test('nothing owed yet: «لا رصيد مستحق الآن»; no commission yet: the empty list and its hint', async () => {
  serve([], { wallet: {} });
  await renderWithQuery(<MyWalletView />);
  expect(await screen.findByText(W.none)).toBeTruthy();
  expect(await screen.findByText(W.empty)).toBeTruthy();
  expect(screen.getByText(W.emptyHint)).toBeTruthy();
});

test('each entry in two lines: «+50 …», the day and its state, then code · student · kind · how it was paid (short words)', async () => {
  const due = myCommission();
  const renewal = myCommission({ id: 'c2', kind: 'renewal', share_percent: 50, amount: 25, method: 'bank', state: 'in_statement', statement_month: '2026-10-01' });
  serve([due, renewal], { wallet: {} });
  await renderWithQuery(<MyWalletView />);
  expect(await screen.findByText(commissionLine(due))).toBeTruthy();
  expect(commissionLine(due)).toContain(t.assistants.ledger.kind.first);
  expect(commissionLine(due)).toContain(W.method.card);
  expect(commissionLine(renewal)).toContain(W.method.bank);
  // The day sits on line 1, so line 2 fits 360dp.
  expect(screen.getAllByText(commissionDay(due, 'Asia/Riyadh')).length).toBeGreaterThan(0);
  expect(commissionLine(due)).not.toContain(commissionDay(due, 'Asia/Riyadh'));
  expect(screen.getByText(/\+50/)).toBeTruthy();
  expect(screen.getByText(t.assistantPortal.commission.earned)).toBeTruthy();
  expect(commissionLine(renewal)).toContain(t.assistants.ledger.kind.renewal.replace('{n}', '50'));
  expect(screen.getByText(new RegExp(W.state.in_statement.split('{month}')[0] ?? ''))).toBeTruthy();
});

test('a voided entry: «ملغاة», no sign, and why in short: the system reason, or «ألغتها الإدارة»', async () => {
  const refunded = myCommission({ state: 'voided', void_reason: 'payment_voided' });
  const byAdmin = myCommission({ id: 'c2', state: 'voided', void_reason: null });
  serve([refunded, byAdmin], { wallet: {} });
  await renderWithQuery(<MyWalletView />);
  expect(await screen.findByText(new RegExp(W.voided.payment_voided))).toBeTruthy();
  expect(screen.getByText(new RegExp(W.voidedByAdmin))).toBeTruthy();
  expect(screen.getAllByText(t.assistantPortal.commission.voided)).toHaveLength(2);
  expect(screen.queryByText(/\+50/)).toBeNull();
});

test('the end of the list asks for page 2 (25 in all, 20 a page)', async () => {
  serve([myCommission(), myCommission({ id: 'c2' })], { total: 25 });
  await renderWithQuery(<MyWalletView />);
  await screen.findAllByText(/AB-1022/);
  const nativeEvent = { contentOffset: { x: 0, y: 2000 }, contentSize: { width: 400, height: 2300 }, layoutMeasurement: { width: 400, height: 900 } };
  await act(async () => screen.getByTestId('wallet-list').props.onScroll({ nativeEvent }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/commissions?page=2&pageSize=20'));
});

test('a new «عمولة جديدة» on the bell refreshes the wallet; the hook itself never polls the bell', async () => {
  serve();
  const { client } = await renderWithQuery(<MyWalletView />);
  await screen.findByTestId('wallet-EGP');
  await waitFor(() => expect(calls('/me/notifications')).toBe(1));
  const before = { list: calls('/sales/me/commissions'), earnings: calls('/sales/me/earnings') };
  bell = [bellRow('n1')];
  await act(async () => client.refetchQueries({ queryKey: ['notifications', 'list'] }));
  await waitFor(() => expect(calls('/sales/me/commissions')).toBe(before.list + 1));
  expect(calls('/sales/me/earnings')).toBe(before.earnings + 1);
  expect(calls('/me/notifications')).toBe(2);
});

test('a pull refreshes the balance with the rows, not the rows alone', async () => {
  serve();
  await renderWithQuery(<MyWalletView />);
  await screen.findByTestId('wallet-EGP');
  const before = { list: calls('/sales/me/commissions'), earnings: calls('/sales/me/earnings') };
  await act(async () => screen.getByTestId('wallet-list').props.refreshControl.props.onRefresh());
  await waitFor(() => expect(calls('/sales/me/earnings')).toBe(before.earnings + 1));
  await waitFor(() => expect(calls('/sales/me/commissions')).toBe(before.list + 1));
});

test('the balance failed to load: its own message and retry above the entries', async () => {
  serve([myCommission()], { earningsDown: true });
  await renderWithQuery(<MyWalletView />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
  expect(screen.getByText(commissionLine(myCommission()))).toBeTruthy();
  const before = calls('/sales/me/earnings');
  await act(async () => fireEvent.press(screen.getByText(t.mobile.retry)));
  await waitFor(() => expect(calls('/sales/me/earnings')).toBe(before + 1));
});

test('below zero (voided after it was paid): «يُخصم من كشفك القادم» and the amount without a minus', async () => {
  serve([], { wallet: { EGP: { due: -50, paid: 50, this_month: 0 } } });
  await renderWithQuery(<MyWalletView />);
  expect(await screen.findByText(W.owedBack)).toBeTruthy();
  expect(screen.queryByText(W.due)).toBeNull();
  expect(screen.getByTestId('wallet-EGP')).not.toHaveTextContent(/[-−]\s*50/);
});
