import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { balanceOf, OLD_SUB_ID, subscription } from '../fixtures';
import { PaymentScreen } from './PaymentScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const m = t.payments.mobile;
const balanceKey = ['students', 's1', 'balance'];
const offline = new TypeError('Network request failed');

beforeEach(() => jest.clearAllMocks());

async function fillAndSave() {
  await fireEvent.changeText(await screen.findByLabelText(t.payments.amount), '145');
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.wallet }));
  await fireEvent.press(screen.getByRole('button', { name: m.record }));
}

test('nothing entered: amount and method are required, nothing is sent', async () => {
  mockApiFetch.mockResolvedValue(balanceOf(subscription()));
  await renderWithQuery(<PaymentScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: m.record }));
  expect(screen.getAllByText(t.common.required)).toHaveLength(2);
  await fireEvent.changeText(screen.getByLabelText(t.payments.amount), '12.345');
  expect(screen.getByText(m.amountInvalid)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('offline: the saved package shows but saving is blocked until «حاول مرة أخرى» gets through', async () => {
  const client = createTestQueryClient();
  client.setQueryData(balanceKey, balanceOf(subscription()), { updatedAt: Date.now() - 600_000 });
  mockApiFetch.mockRejectedValue(offline);
  await renderWithQuery(<PaymentScreen />, client);
  expect(await screen.findByText(m.offline)).toBeTruthy();
  expect(screen.getByRole('header', { name: 'دفعة لـهدى' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.record })).toBeNull();

  mockApiFetch.mockResolvedValue(balanceOf(subscription()));
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('button', { name: m.record })).toBeTruthy();
  expect(screen.queryByText(m.offline)).toBeNull();
});

test('the network drops while saving: says so, keeps what was typed', async () => {
  mockApiFetch.mockResolvedValue(balanceOf(subscription()));
  mockApiSend.mockRejectedValue(offline);
  await renderWithQuery(<PaymentScreen />);
  await fillAndSave();
  expect(await screen.findByText(m.offline)).toBeTruthy();
  expect(screen.getByDisplayValue('145')).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test('refused by the API: its reason, the form kept', async () => {
  mockApiFetch.mockResolvedValue(balanceOf(subscription()));
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'currency_mismatch', currency: 'SAR' }));
  await renderWithQuery(<PaymentScreen />);
  await fillAndSave();
  expect(await screen.findByText(t.payments.error.currency_mismatch.replace('{currency}', 'SAR'))).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.paymentMethod.wallet, checked: true })).toBeTruthy();
});

test('an older package still owed: both offered, the oldest picked; the paid line follows', async () => {
  const old = subscription({ id: OLD_SUB_ID, starts_on: '2026-08-27', paid: 100, status: 'expired' });
  mockApiFetch.mockResolvedValue(balanceOf(old, subscription()));
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<PaymentScreen />);
  const oldPill = await screen.findByRole('radio', { name: /27 أغسطس 2026/ });
  expect(oldPill.props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByText(/دُفع ⁦100⁩/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /24 سبتمبر 2026/ }));
  expect(screen.getByText(/دُفع ⁦0⁩/)).toBeTruthy();
  await fillAndSave();
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/payments', expect.objectContaining({ subscriptionId: subscription().id }));
});

test('no package yet: the empty state, no form', async () => {
  mockApiFetch.mockResolvedValue(balanceOf());
  await renderWithQuery(<PaymentScreen />);
  expect(await screen.findByText(t.subscriptions.empty)).toBeTruthy();
  expect(screen.queryByLabelText(t.payments.amount)).toBeNull();
});

test('nothing cached and the read fails: the error state with a retry', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(500));
  await renderWithQuery(<PaymentScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.payments.record })).toBeTruthy();
});
