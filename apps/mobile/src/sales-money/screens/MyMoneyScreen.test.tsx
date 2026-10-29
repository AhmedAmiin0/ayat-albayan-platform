import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { commissionPage, earnings, myCommission, myPayment } from '../testing/fixtures';
import { MyMoneyScreen } from './MyMoneyScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockParams = jest.fn((): { view?: string } => ({}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => mockParams() }));

const p = t.assistantPortal.earnings;
const W = t.assistantPortal.wallet;

/** Each GET /sales/me/* (and the bell) answers its own shape. */
function serve(over: { earnings?: unknown; payments?: unknown } = {}) {
  mockApiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/sales/me/commissions')) return Promise.resolve(commissionPage([myCommission()]));
    if (path.startsWith('/me/notifications')) return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20, unread: 0 });
    if (path === '/sales/me/payments') return Promise.resolve(over.payments ?? [myPayment()]);
    return Promise.resolve(over.earnings ?? earnings());
  });
}
const open = async (tab: string) => fireEvent.press(screen.getByRole('tab', { name: tab }));

beforeEach(() => mockApiFetch.mockReset());

test('«محفظتي»: three filters, «العمولات» first: the balance per currency, then my commissions', async () => {
  serve();
  await renderWithQuery(<MyMoneyScreen />);
  expect(screen.getByRole('header', { name: t.assistantPortal.nav.earnings })).toBeTruthy();
  for (const tab of [W.views.commissions, W.views.statements, t.assistantPortal.nav.payments]) expect(screen.getByRole('tab', { name: tab })).toBeTruthy();
  expect(await screen.findByTestId('wallet-EGP')).toHaveTextContent(/50/);
  expect(screen.getByTestId('wallet-SAR')).toHaveTextContent(/75/);
  expect(await screen.findByText(/AB-1022/)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/commissions?page=1&pageSize=20');
  expect(screen.queryByText(p.terms)).toBeNull();
});

test('«الكشوف»: terms, this month per currency, statements with status; no commissions total any more', async () => {
  serve();
  await renderWithQuery(<MyMoneyScreen />);
  await open(W.views.statements);
  expect(await screen.findByText(p.terms)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/earnings');
  expect(screen.getByText(new RegExp(p.commissionPercent.replace('{value}', '10')))).toBeTruthy();
  expect(screen.getAllByTestId('totals-EGP')[0]).toHaveTextContent(/3,000/);
  expect(screen.getByTestId('totals-SAR')).toHaveTextContent(/25/);
  expect(screen.queryByLabelText(p.commissionsTotal)).toBeNull();
  expect(screen.getByText(t.enums.payoutStatus.paid)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: `${p.lines} · ${t.mobileSalesMoney.showLines}` }));
  expect(screen.getByText(p.line.commission.replace('{student}', 'سهيلة'))).toBeTruthy();
  expect(screen.getByText(p.line.adjustment.replace('{reason}', isolate('تصحيح')))).toBeTruthy();
});

test('«الكشوف» with no terms and no statement yet: the web’s words', async () => {
  serve({ earnings: earnings({ terms: null, statements: [], commissions_total: {} }) });
  await renderWithQuery(<MyMoneyScreen />);
  await open(W.views.statements);
  expect(await screen.findByText(p.noTerms)).toBeTruthy();
  expect(screen.getByText(p.statementsEmpty)).toBeTruthy();
  expect(screen.getByText(p.statementsEmptyHint)).toBeTruthy();
});

test('a failed read shows the error with a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<MyMoneyScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});

test('«مدفوعاتي» is a filter of the page: GET /sales/me/payments, amount in its own currency', async () => {
  serve();
  await renderWithQuery(<MyMoneyScreen />);
  await open(t.assistantPortal.nav.payments);
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/payments');
  expect(screen.getByText(/500/)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.enums.paymentMethod.bank))).toBeTruthy();
});

test('«مدفوعاتي» empty and failed states', async () => {
  serve({ payments: [] });
  await renderWithQuery(<MyMoneyScreen />);
  await open(t.assistantPortal.nav.payments);
  expect(await screen.findByText(t.assistantPortal.payments.empty)).toBeTruthy();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<MyMoneyScreen />);
  const tabs = screen.getAllByRole('tab', { name: t.assistantPortal.nav.payments });
  await fireEvent.press(tabs[tabs.length - 1] as never);
  await waitFor(() => expect(screen.getAllByText(t.sales.loadFailed).length).toBeGreaterThan(0));
});

test('?view=payments (from the sales transfer’s success screen) opens «مدفوعاتي» directly', async () => {
  mockParams.mockReturnValueOnce({ view: 'payments' });
  serve();
  await renderWithQuery(<MyMoneyScreen />);
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/payments');
});
