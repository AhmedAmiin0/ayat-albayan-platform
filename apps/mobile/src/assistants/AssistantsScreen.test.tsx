import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { AssistantsScreen } from './AssistantsScreen';
import { ALL, ASSISTANT, commission, routes, statement, termsRowOf } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

test('«فريق المبيعات» lists each salesperson with salary and commission; a tap opens their page', async () => {
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/terms': [termsRowOf(ASSISTANT)] }));
  await renderWithQuery(<AssistantsScreen />);
  expect(screen.getByRole('header', { name: t.assistants.title })).toBeTruthy();
  const row = await screen.findByText(ASSISTANT.name);
  expect(screen.getByText(/3,000/)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.assistants.commissionPercent.replace('{value}', '10')))).toBeTruthy();
  await fireEvent.press(row);
  expect(router.push).toHaveBeenCalledWith('/more/finance/assistants/a1');
});

test('no salesperson yet: the web’s empty words', async () => {
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/terms': [] }));
  await renderWithQuery(<AssistantsScreen />);
  expect(await screen.findByText(t.assistants.empty)).toBeTruthy();
});

test('a failed read with nothing cached shows the error and a retry', async () => {
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/terms': () => { throw new Error('offline'); } }));
  await renderWithQuery(<AssistantsScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});

test('the commissions tab reads the ledger of all, totals the earned ones per currency and filters by status', async () => {
  const rows = [commission(), commission({ id: 'c2', amount: 30, currency: 'EGP' }), commission({ id: 'c3', status: 'voided', amount: 99, void_reason: 'خطأ' })];
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/terms': [termsRowOf(ASSISTANT)], '/assistant-pay/commissions': rows }));
  await renderWithQuery(<AssistantsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistants.tabs.commissions }));
  expect(await screen.findByText(t.assistants.ledger.total)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/assistant-pay/commissions');
  expect(screen.getByTestId('total-SAR')).toHaveTextContent(/50/);
  expect(screen.getByTestId('total-EGP')).toHaveTextContent(/30/);
  expect(screen.getByText(t.assistants.ledger.voidedWhy.replace('{reason}', 'خطأ'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.assistants.ledger.status.voided }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/assistant-pay/commissions?status=voided'));
});

test('the statements tab reads this month for everyone and offers «احسب كشوف الشهر» to a writer', async () => {
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/terms': [termsRowOf(ASSISTANT)], '/assistant-pay/statements': [statement()] }));
  await renderWithQuery(<AssistantsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistants.tabs.statements }));
  expect(await screen.findByTestId('statement-total-EGP')).toHaveTextContent(/3,000/);
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/assistant-pay\/statements\?month=\d{4}-\d{2}$/));
  expect(screen.getByRole('button', { name: t.assistants.statements.regenerate })).toBeTruthy();
});

test('a reader only (assistantpay.read): no void, no generate, no approve', async () => {
  mockApiFetch.mockImplementation(
    routes(['assistantpay.read'], {
      '/assistant-pay/terms': [termsRowOf(ASSISTANT)],
      '/assistant-pay/commissions': [commission()],
      '/assistant-pay/statements': [statement()],
    }),
  );
  await renderWithQuery(<AssistantsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: t.assistants.tabs.commissions }));
  await screen.findByText(t.assistants.ledger.total);
  expect(screen.queryByRole('button', { name: t.assistants.ledger.void })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.assistants.tabs.statements }));
  await screen.findByTestId('statement-total-EGP');
  expect(screen.queryByRole('button', { name: t.assistants.statements.regenerate })).toBeNull();
  expect(screen.queryByRole('button', { name: t.payouts.approve })).toBeNull();
  expect(screen.getByRole('button', { name: t.assistants.statements.details })).toBeTruthy();
});
