import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { INVOICE } from './fixtures';
import { InvoicesScreen } from './InvoicesScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

test('each invoice shows its students, date, kind and whether a payment was recorded from it', async () => {
  mockApiFetch.mockResolvedValue(page([INVOICE(1), INVOICE(2, { students: [{ id: 'b', name: 'محمد', code: 'AB-2' }], payment_id: 'pay1', kind: 'makeup' })]));
  await renderWithQuery(<InvoicesScreen />);
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/invoices\/recent\?/));
  expect(screen.getByText(t.mobileFinance.invoices.notRecorded)).toBeTruthy();
  expect(screen.getByText(t.finance.invoicePaid)).toBeTruthy();
  expect(screen.getByText(/حلقة تعويضية/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.finance.recordFromInvoice })).toBeNull();
});

test('no invoices, and a failed load with nothing cached', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  const first = await renderWithQuery(<InvoicesScreen />);
  expect(await screen.findByText(t.mobileFinance.invoices.empty)).toBeTruthy();
  first.unmount();
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<InvoicesScreen />);
  expect(await screen.findByText(t.mobileFinance.loadFailed)).toBeTruthy();
});
