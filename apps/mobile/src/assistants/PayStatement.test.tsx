import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ALL, ASSISTANT, routes, statement } from './api/fixtures';
import { StatementsPanel } from './statements/components/StatementsPanel';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
const mockUpload = jest.fn();
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: (...a: unknown[]) => mockUpload(...a) }) } },
}));
const mockPicked = { uri: 'file://r.jpg', mime: 'image/jpeg', bytes: new ArrayBuffer(4), size: 4 };
jest.mock('@/core/ui/form/ReceiptPicker', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    ReceiptPicker: ({ onChange }: { onChange: (r: unknown) => void }) => (
      <View><Pressable accessibilityRole="button" accessibilityLabel="pick" onPress={() => onChange(mockPicked)} /></View>
    ),
  };
});

const onNotice = jest.fn();
const SIGNED = { bucket: 'receipts', path: 'a1/r.jpg', token: 'tok' };
const APPROVED = statement({ status: 'approved', approved_at: '2026-11-01T09:00:00Z' });

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(
    routes(ALL, { '/assistant-pay/statements/st1/receipt': { url: 'https://files/r.jpg', expires_at: 'x' }, '/assistant-pay/statements': [APPROVED] }),
  );
  mockUpload.mockResolvedValue({ error: null });
});
const open = async () => {
  await renderWithQuery(<StatementsPanel assistants={[ASSISTANT]} assistantId="a1" can={{ read: true, write: true, approve: true }} onNotice={onNotice} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.payouts.markPaid }));
};

test('pay with receipt: the upload URL first ({assistantId, mime, size}), the photo up, then pay with its path', async () => {
  mockApiSend.mockImplementation((_m: string, path: string) => Promise.resolve(path.endsWith('receipt-upload-url') ? SIGNED : { ...APPROVED, status: 'paid' }));
  await open();
  expect(screen.getByText(/3,000/)).toBeTruthy();
  await fireEvent.press(screen.getByText(t.enums.paymentMethod.wallet));
  await fireEvent.changeText(screen.getByLabelText(t.payments.note), 'تحويل');
  await fireEvent.press(screen.getByRole('button', { name: 'pick' }));
  await fireEvent.press(screen.getByRole('button', { name: t.finance.confirmPaid }));
  await waitFor(() => expect(onNotice).toHaveBeenCalledWith(t.mobileSalesMoney.done.pay));
  expect(mockApiSend.mock.calls[0]).toEqual(['POST', '/assistant-pay/receipt-upload-url', { assistantId: 'a1', mime: 'image/jpeg', size: 4 }]);
  expect(mockUpload).toHaveBeenCalledWith('a1/r.jpg', 'tok', mockPicked.bytes, { contentType: 'image/jpeg' });
  expect(mockApiSend.mock.calls[1]).toEqual([
    'POST',
    '/assistant-pay/statements/st1/pay',
    expect.objectContaining({ method: 'wallet', note: 'تحويل', receiptPath: 'a1/r.jpg', paidAt: expect.any(String) }),
  ]);
});

test('a refused pay keeps the form, says why, and a retry does not upload the receipt again', async () => {
  let pays = 0;
  mockApiSend.mockImplementation((_m: string, path: string) => {
    if (path.endsWith('receipt-upload-url')) return Promise.resolve(SIGNED);
    pays += 1;
    return pays === 1 ? Promise.reject(new TypeError('Network request failed')) : Promise.resolve(APPROVED);
  });
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'pick' }));
  await fireEvent.press(screen.getByRole('button', { name: t.finance.confirmPaid }));
  expect(await screen.findByText(t.mobileFinance.offline)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.finance.confirmPaid }));
  await waitFor(() => expect(pays).toBe(2));
  expect(mockUpload).toHaveBeenCalledTimes(1);
});

test('a failed upload never pays and says the receipt did not go up', async () => {
  mockApiSend.mockResolvedValue(SIGNED);
  mockUpload.mockResolvedValue({ error: { message: 'boom' } });
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'pick' }));
  await fireEvent.press(screen.getByRole('button', { name: t.finance.confirmPaid }));
  expect(await screen.findByText(t.payments.mobile.uploadFailed)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(1);
});

test('a paid statement with a receipt opens it through a signed link', async () => {
  const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiFetch.mockImplementation(
    routes(ALL, {
      '/assistant-pay/statements/st1/receipt': { url: 'https://files/r.jpg', expires_at: 'x' },
      '/assistant-pay/statements': [statement({ status: 'paid', paid_at: '2026-11-02T09:00:00Z', has_receipt: true })],
    }),
  );
  await renderWithQuery(<StatementsPanel assistants={[ASSISTANT]} assistantId="a1" can={{ read: true, write: true, approve: true }} onNotice={onNotice} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.earnings.viewReceipt }));
  await waitFor(() => expect(spy).toHaveBeenCalledWith('https://files/r.jpg'));
});
