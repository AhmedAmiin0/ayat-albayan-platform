import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { receivable, receivablesView } from './fixtures';
import { ReceivablesScreen } from './ReceivablesScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (mockHref: string) => mockPush(mockHref), back: () => mockBack() },
}));

const view = receivablesView([
  receivable(),
  receivable({ id: 'sub2', student: { id: 's2', code: 'AB-0201', name: 'يوسف' }, owed: 250, days_overdue: 75, guardian: null }),
]);

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('total, then a row per package: name, LTR code, amount owed, days late', async () => {
  mockApiFetch.mockResolvedValue(view);
  await renderWithQuery(<ReceivablesScreen />);
  expect(await screen.findByText('هدى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/receivables');
  expect(screen.getByText(money(350, 'SAR'))).toBeTruthy();
  expect(screen.getByText(money(100, 'SAR'))).toBeTruthy();
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(t.mobileMoney.daysLate.replace('{n}', '75'))).toBeTruthy();
  expect(screen.getByText(t.mobileMoney.receivablesCount.replace('{n}', '2'))).toBeTruthy();
});

test('the search narrows the loaded rows without another request', async () => {
  mockApiFetch.mockResolvedValue(view);
  await renderWithQuery(<ReceivablesScreen />);
  await screen.findByText('هدى');
  const field = screen.getByLabelText(t.mobileMoney.receivablesSearch);
  await fireEvent.changeText(field, 'AB-0201');
  await fireEvent(field, 'submitEditing');
  await waitFor(() => expect(screen.queryByText('هدى')).toBeNull());
  expect(screen.getByText('يوسف')).toBeTruthy();
  expect(mockApiFetch.mock.calls.filter(([path]) => path === '/receivables')).toHaveLength(1);
});

test('a row opens the existing payment form for that student', async () => {
  mockApiFetch.mockResolvedValue(view);
  await renderWithQuery(<ReceivablesScreen />);
  await fireEvent.press(await screen.findByText('يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/students/payment/s2');
});

test('a currency without a rate is named under the total', async () => {
  mockApiFetch.mockResolvedValue({ ...view, fx_missing: ['EGP'] });
  await renderWithQuery(<ReceivablesScreen />);
  expect(await screen.findByText(t.mobileMoney.fxMissing.replace('{currencies}', 'EGP'))).toBeTruthy();
});

test('nobody owes: the empty state; a search that finds nothing says so', async () => {
  mockApiFetch.mockResolvedValue(receivablesView([]));
  await renderWithQuery(<ReceivablesScreen />);
  expect(await screen.findByRole('header', { name: t.mobileMoney.receivablesEmpty })).toBeTruthy();
});

test('failed with nothing cached: error + retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<ReceivablesScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  mockApiFetch.mockResolvedValue(view);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('هدى')).toBeTruthy();
});

test('offline with a cached answer: rows stay, no error', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  const client = createTestQueryClient();
  client.setQueryData(['receivables'], view);
  await renderWithQuery(<ReceivablesScreen />, client);
  await waitFor(() => expect(client.getQueryState(['receivables'])?.status).toBe('error'));
  expect(screen.getByText('هدى')).toBeTruthy();
  expect(screen.queryByText(t.common.error)).toBeNull();
});

test('«رجوع» goes back', async () => {
  mockApiFetch.mockResolvedValue(view);
  await renderWithQuery(<ReceivablesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.common.back }));
  expect(mockBack).toHaveBeenCalled();
});
