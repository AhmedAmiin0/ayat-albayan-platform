import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { CATEGORIES, EXPENSE } from './fixtures';
import { ExpensesScreen } from './ExpensesScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
const mockPicked = { uri: 'file://slip.jpg', mime: 'image/jpeg', bytes: new ArrayBuffer(4), size: 4 };
jest.mock('@/payments/ReceiptPicker', () => {
  const { Pressable } = jest.requireActual('react-native');
  return { ReceiptPicker: ({ onChange }: { onChange: (r: unknown) => void }) => <Pressable accessibilityRole="button" accessibilityLabel="pick-receipt" onPress={() => onChange(mockPicked)} /> };
});
const mockUpload = jest.fn();
jest.mock('./upload-expense-receipt', () => ({ uploadExpenseReceipt: (...a: unknown[]) => mockUpload(...a) }));

const ROWS = [EXPENSE(1), EXPENSE(2, { category: 'rent', amount: 300, vendor: 'المالك', has_receipt: true }), EXPENSE(3, { is_draft: true, amount: 999 })];
beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation((p: string) => Promise.resolve(p.startsWith('/expense-categories') ? CATEGORIES : ROWS));
});

test('the month list shows the total without drafts, the categories biggest first, and the draft mark', async () => {
  await renderWithQuery(<ExpensesScreen />);
  expect(await screen.findByText(t.mobileFinance.expenses.monthTotal.replace('{amount}', '⁦400⁩ ج.م'))).toBeTruthy();
  expect(screen.getByText(t.mobileFinance.expenses.byCategory)).toBeTruthy();
  expect(screen.getByText(t.finance.draft)).toBeTruthy();
  expect(screen.getByText(/المالك/)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.mobileFinance.expenses.withReceipt))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/expenses\?month=\d{4}-\d{2}$/));
});

test('an empty month says so', async () => {
  mockApiFetch.mockImplementation((p: string) => Promise.resolve(p.startsWith('/expense-categories') ? CATEGORIES : []));
  await renderWithQuery(<ExpensesScreen />);
  expect(await screen.findByText(t.expenses.empty)).toBeTruthy();
});

test('«إضافة مصروف» refuses an empty form without sending anything', async () => {
  await renderWithQuery(<ExpensesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.expenses.add }));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.expenses.save }));
  expect(await screen.findByText(t.mobileFinance.expenses.categoryRequired)).toBeTruthy();
  expect(screen.getByText(t.common.required)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('adding an expense with a receipt photo: uploads it, POSTs /expenses, returns to the list', async () => {
  mockUpload.mockResolvedValue('expenses/slip.jpg');
  mockApiSend.mockResolvedValue(EXPENSE(9));
  await renderWithQuery(<ExpensesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.expenses.add }));
  await fireEvent.press(screen.getByText('إيجار'));
  await fireEvent.changeText(screen.getByLabelText(t.payments.amount), '١٢٠٫٥');
  await fireEvent.changeText(screen.getByLabelText(t.finance.vendor), 'المالك');
  await fireEvent.press(screen.getByText(t.enums.paymentMethod.cash));
  await fireEvent.press(screen.getByRole('button', { name: 'pick-receipt' }));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.expenses.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockUpload).toHaveBeenCalledWith(mockPicked);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/expenses', expect.objectContaining({ category: 'rent', amount: 120.5, currency: 'EGP', vendor: 'المالك', method: 'cash', receiptPath: 'expenses/slip.jpg' }));
  expect(await screen.findByText(t.expenses.saved)).toBeTruthy();
});

test('a failed save keeps the form and its photo; the retry does not upload twice', async () => {
  mockUpload.mockResolvedValue('expenses/slip.jpg');
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue(EXPENSE(9));
  await renderWithQuery(<ExpensesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.expenses.add }));
  await fireEvent.press(screen.getByText('إعلانات'));
  await fireEvent.changeText(screen.getByLabelText(t.payments.amount), '50');
  await fireEvent.press(screen.getByRole('button', { name: 'pick-receipt' }));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.expenses.save }));
  expect(await screen.findByText(t.mobileFinance.offline)).toBeTruthy();
  expect(screen.getByDisplayValue('50')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.expenses.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(mockUpload).toHaveBeenCalledTimes(1);
});
