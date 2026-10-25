import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { APPROVED, PAID } from '../shared/fixtures';
import { PayoutsScreen } from './PayoutsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
const mockPicked = { uri: 'file://r.jpg', mime: 'image/jpeg', bytes: new ArrayBuffer(4), size: 4 };
jest.mock('@/payments/ReceiptPicker', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    ReceiptPicker: ({ onChange }: { onChange: (r: unknown) => void }) => (
      <View><Pressable accessibilityRole="button" accessibilityLabel="pick" onPress={() => onChange(mockPicked)} /></View>
    ),
  };
});
const mockUpload = jest.fn();
jest.mock('@/earnings/hooks/upload-receipt', () => ({ uploadTeacherReceipt: (...a: unknown[]) => mockUpload(...a) }));

let mockOpen: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockOpen = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiFetch.mockImplementation((p: string) =>
    Promise.resolve(p.includes('/receipt') ? { url: 'https://files/r.jpg', expires_at: 'x' } : [APPROVED, PAID]),
  );
});

test('«تأكيد الدفع» uploads the receipt once and POSTs method, day, note and path', async () => {
  mockUpload.mockResolvedValue('t2/r.jpg');
  mockApiSend.mockResolvedValue({ ...APPROVED, status: 'paid' });
  await renderWithQuery(<PayoutsScreen />);
  await fireEvent.press(await screen.findByText('سلمى'));
  await fireEvent.press(screen.getByRole('button', { name: t.finance.confirmPaid }));
  expect(screen.getAllByText(/1,500/).length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByText(t.enums.paymentMethod.wallet));
  await fireEvent.changeText(screen.getByLabelText(t.payments.note), 'محفظة');
  await fireEvent.press(screen.getByRole('button', { name: 'pick' }));
  await fireEvent.press(screen.getByText(t.finance.confirmPaid));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockUpload).toHaveBeenCalledWith('t2', mockPicked);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/payouts/p2/pay', expect.objectContaining({ method: 'wallet', note: 'محفظة', receiptPath: 't2/r.jpg' }));
  expect(await screen.findByText(t.mobileFinance.payouts.done.pay)).toBeTruthy();
});

test('a refused payment keeps the form and the receipt is not uploaded again on retry', async () => {
  mockUpload.mockResolvedValue('t2/r.jpg');
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue({});
  await renderWithQuery(<PayoutsScreen />);
  await fireEvent.press(await screen.findByText('سلمى'));
  await fireEvent.press(screen.getByRole('button', { name: t.finance.confirmPaid }));
  await fireEvent.press(screen.getByRole('button', { name: 'pick' }));
  await fireEvent.press(screen.getByText(t.finance.confirmPaid));
  expect(await screen.findByText(t.mobileFinance.offline)).toBeTruthy();
  await fireEvent.press(screen.getByText(t.finance.confirmPaid));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(mockUpload).toHaveBeenCalledTimes(1);
});

test('a paid month shows how it was paid and opens its receipt through a signed link', async () => {
  await renderWithQuery(<PayoutsScreen />);
  await fireEvent.press(await screen.findByText('هدى'));
  expect(screen.getByText(t.mobileFinance.payouts.method.replace('{method}', t.enums.paymentMethod.bank))).toBeTruthy();
  expect(screen.getByText(t.mobileFinance.payouts.note.replace('{note}', 'دفعة أكتوبر'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.earnings.viewReceipt }));
  await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('https://files/r.jpg'));
});
