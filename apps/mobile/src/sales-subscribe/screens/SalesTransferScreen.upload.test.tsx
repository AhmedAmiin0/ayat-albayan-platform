import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID2, kid, openSub, salesPayment, SUB } from '../testing/fixtures';
import { SalesTransferScreen } from './SalesTransferScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockUpload = jest.fn();
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: mockUpload }) } },
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const m = t.salesMoney;
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const signed = { bucket: 'receipts', path: `${SUB}/9f.jpg`, token: 'tok', signed_url: 'http://x/sign' };
const other = openSub({ id: 'sub-2', student: { id: KID2, code: 'AB-0202', name: 'سلمى' }, due: 90 });

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(familyOf(kid({ open: [openSub()] }), kid({ id: KID2, open: [other] })));
  mockUpload.mockResolvedValue({ data: { path: signed.path }, error: null });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///cache/slip.jpg', width: 900, height: 1200, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
  });
});

test('two owed packages: pick one → photo → sales upload once, one key across a retry → «تم تسجيل التحويل»', async () => {
  let posts = 0;
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/sales/payments/receipt-upload-url') return signed;
    posts += 1;
    if (posts === 1) throw new ApiError(400, { code: 'currency_mismatch', currency: 'SAR' });
    return salesPayment('trial');
  });
  await renderWithQuery(<SalesTransferScreen />);
  await fireEvent.press(await screen.findByRole('radio', { name: new RegExp('سلمى') }));
  await fireEvent.press(await screen.findByRole('radio', { name: new RegExp('ريم') }));
  expect(screen.getByLabelText(t.payments.amount)).toHaveProp('value', '180');
  await fireEvent.press(screen.getByRole('button', { name: m.receiptLibrary }));
  expect(await screen.findByText(m.attachmentN.replace('{n}', '1'))).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.error.currency_mismatch.replace('{currency}', 'SAR'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.transferSaved)).toBeTruthy();

  expect(sent('/sales/payments/receipt-upload-url')).toEqual([
    ['POST', '/sales/payments/receipt-upload-url', { subscriptionId: SUB, mime: 'image/jpeg', size: 5 }],
  ]);
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(sent('/payments/receipt-upload-url')).toHaveLength(0);
  const [first, second] = sent('/sales/payments').map((c) => c[2] as { clientRequestId: string; attachments: string[] });
  expect(first?.attachments).toEqual([signed.path]);
  expect(first).not.toHaveProperty('receiptPath');
  expect(second?.clientRequestId).toBe(first?.clientRequestId);
});

test('no package picked among two: no form yet', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  expect(await screen.findByRole('radio', { name: new RegExp('سلمى') })).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.saveTransfer })).toBeNull();
  await waitFor(() => expect(mockApiSend).not.toHaveBeenCalled());
});
