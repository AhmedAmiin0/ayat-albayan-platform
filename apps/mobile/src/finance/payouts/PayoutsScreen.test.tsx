import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { APPROVED, PAID, PAYOUT } from '../shared/fixtures';
import { PayoutsScreen } from './PayoutsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/payments/ReceiptPicker', () => ({ ReceiptPicker: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue([PAYOUT, APPROVED, PAID]);
});

const open = async (name: string) => {
  await renderWithQuery(<PayoutsScreen />);
  await fireEvent.press(await screen.findByText(name));
};

test('the month list reads GET /payouts?month= and shows each teacher with her state', async () => {
  await renderWithQuery(<PayoutsScreen />);
  expect(await screen.findByText('أبرار')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/payouts\?month=\d{4}-\d{2}$/));
  expect(screen.getByText(t.enums.payoutStatus.draft)).toBeTruthy();
  expect(screen.getByText(t.enums.payoutStatus.approved)).toBeTruthy();
  expect(screen.getByText(t.enums.payoutStatus.paid)).toBeTruthy();
});

test('going back a month re-reads that month; the next arrow is off on the current one', async () => {
  await renderWithQuery(<PayoutsScreen />);
  await screen.findByText('أبرار');
  expect(screen.getByRole('button', { name: t.mobileFinance.month.next }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.month.prev }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  expect(mockApiFetch.mock.calls[1]?.[0]).not.toBe(mockApiFetch.mock.calls[0]?.[0]);
});

test('an empty month, a failed load with nothing cached', async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<PayoutsScreen />);
  expect(await screen.findByText(t.payouts.empty)).toBeTruthy();
});

test('a failed first load offers a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<PayoutsScreen />);
  expect(await screen.findByText(t.mobileFinance.loadFailed)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
});

test('a draft asks once, then POSTs /approve and re-reads the month', async () => {
  mockApiSend.mockResolvedValue({ ...PAYOUT, status: 'approved' });
  await open('أبرار');
  await fireEvent.press(screen.getByRole('button', { name: t.payouts.approve }));
  expect(screen.getByText(/اعتماد مستحقات أبرار/)).toBeTruthy();
  mockApiFetch.mockResolvedValue([{ ...PAYOUT, status: 'approved' }]);
  await fireEvent.press(screen.getAllByRole('button', { name: t.payouts.approve })[0] as never);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/payouts/p1/approve', undefined));
  expect(await screen.findByText(t.mobileFinance.payouts.done.approve)).toBeTruthy();
  expect(await screen.findByRole('button', { name: t.finance.confirmPaid })).toBeTruthy();
});

test('a refusal from the server is shown and keeps the question open', async () => {
  mockApiSend.mockRejectedValue(Object.assign(new (jest.requireActual('@/core/lib/http/api').ApiError)(409, { code: 'month_not_over' })));
  await open('أبرار');
  await fireEvent.press(screen.getByRole('button', { name: t.payouts.approve }));
  await fireEvent.press(screen.getAllByRole('button', { name: t.payouts.approve })[0] as never);
  expect(await screen.findByText(t.payouts.error.month_not_over)).toBeTruthy();
});

test('reopen an approved month', async () => {
  mockApiSend.mockResolvedValue({ ...APPROVED, status: 'draft' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: t.finance.reopen }));
  await fireEvent.press(screen.getAllByRole('button', { name: t.finance.reopen })[0] as never);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/payouts/p2/reopen', undefined));
});

test('cancelling a payment needs a reason of 3 letters and sends it', async () => {
  mockApiSend.mockResolvedValue({ ...PAID, status: 'approved' });
  await open('هدى');
  await fireEvent.press(screen.getByRole('button', { name: t.finance.unpay }));
  await fireEvent.press(screen.getAllByRole('button', { name: t.finance.unpay })[0] as never);
  expect(await screen.findByText(t.finance.reasonRequired)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.finance.reason), ' خطأ في المبلغ ');
  await fireEvent.press(screen.getAllByRole('button', { name: t.finance.unpay })[0] as never);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/payouts/p3/unpay', { reason: 'خطأ في المبلغ' }));
});
