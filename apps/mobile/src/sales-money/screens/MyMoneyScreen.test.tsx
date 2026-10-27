import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { earnings, myPayment } from '../testing/fixtures';
import { MyMoneyScreen } from './MyMoneyScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockParams = jest.fn((): { view?: string } => ({}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => mockParams() }));

const p = t.assistantPortal.earnings;
beforeEach(() => mockApiFetch.mockReset());

test('«أرباحي»: terms, this month per currency, commissions per currency, statements with status', async () => {
  mockApiFetch.mockResolvedValue(earnings());
  await renderWithQuery(<MyMoneyScreen />);
  expect(screen.getByRole('header', { name: t.assistantPortal.nav.earnings })).toBeTruthy();
  expect(await screen.findByText(p.terms)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/earnings');
  expect(screen.getByText(new RegExp(p.commissionPercent.replace('{value}', '10')))).toBeTruthy();
  expect(screen.getAllByTestId('totals-EGP')[0]).toHaveTextContent(/3,000/);
  expect(screen.getByTestId('totals-SAR')).toHaveTextContent(/25/);
  const total = screen.getByLabelText(p.commissionsTotal);
  expect(total).toHaveTextContent(/40/);
  expect(total).toHaveTextContent(/75/);
  expect(screen.getByText(t.enums.payoutStatus.paid)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: `${p.lines} · ${t.mobileSalesMoney.showLines}` }));
  expect(screen.getByText(p.line.commission.replace('{student}', 'سهيلة'))).toBeTruthy();
  expect(screen.getByText(p.line.adjustment.replace('{reason}', isolate('تصحيح')))).toBeTruthy();
});

test('no terms and no statement yet: the web’s words', async () => {
  mockApiFetch.mockResolvedValue(earnings({ terms: null, statements: [], commissions_total: {} }));
  await renderWithQuery(<MyMoneyScreen />);
  expect(await screen.findByText(p.noTerms)).toBeTruthy();
  expect(screen.getByText(p.statementsEmpty)).toBeTruthy();
  expect(screen.getByText(p.statementsEmptyHint)).toBeTruthy();
  expect(screen.queryByLabelText(p.commissionsTotal)).toBeNull();
});

test('a failed read shows the error with a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<MyMoneyScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});

test('«مدفوعاتي» is a filter of the page: GET /sales/me/payments, amount in its own currency', async () => {
  mockApiFetch.mockImplementation((path: string) => Promise.resolve(path === '/sales/me/payments' ? [myPayment()] : earnings()));
  await renderWithQuery(<MyMoneyScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistantPortal.nav.payments }));
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/payments');
  expect(screen.getByText(/500/)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.enums.paymentMethod.bank))).toBeTruthy();
});

test('«مدفوعاتي» empty and failed states', async () => {
  mockApiFetch.mockImplementation((path: string) => (path === '/sales/me/payments' ? Promise.resolve([]) : Promise.resolve(earnings())));
  await renderWithQuery(<MyMoneyScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistantPortal.nav.payments }));
  expect(await screen.findByText(t.assistantPortal.payments.empty)).toBeTruthy();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<MyMoneyScreen />);
  const tabs = screen.getAllByRole('tab', { name: t.assistantPortal.nav.payments });
  await fireEvent.press(tabs[tabs.length - 1] as never);
  await waitFor(() => expect(screen.getAllByText(t.sales.loadFailed).length).toBeGreaterThan(0));
});

test('?view=payments (from the sales transfer’s success screen) opens «مدفوعاتي» directly', async () => {
  mockParams.mockReturnValueOnce({ view: 'payments' });
  mockApiFetch.mockImplementation((path: string) => Promise.resolve(path === '/sales/me/payments' ? [myPayment()] : earnings()));
  await renderWithQuery(<MyMoneyScreen />);
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/me/payments');
});
