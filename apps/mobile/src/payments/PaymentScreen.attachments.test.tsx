import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { balanceOf, payment, SUB_ID, subscription } from './fixtures';
import { PaymentScreen } from './PaymentScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockUpload = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: mockUpload }) } },
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const p = t.payments;
const method = (m: 'bank' | 'cash') => fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod[m] }));
let picked = 0;
let signed = 0;

beforeEach(() => {
  jest.clearAllMocks();
  picked = 0;
  signed = 0;
  mockApiFetch.mockResolvedValue(balanceOf(subscription()));
  mockUpload.mockResolvedValue({ data: {}, error: null });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockImplementation(async () => {
    picked += 1;
    return { canceled: false, assets: [{ uri: `file:///s-${picked}.jpg`, width: 9, height: 9, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }] };
  });
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path !== '/payments/receipt-upload-url') return payment({ id: 'p2' });
    signed += 1;
    return { bucket: 'receipts', path: `${SUB_ID}/a${signed}.jpg`, token: 'tok', signed_url: 'http://x/s' };
  });
});

test('«المرفقات» only for a bank transfer; two photos are both sent', async () => {
  await renderWithQuery(<PaymentScreen />);
  await fireEvent.changeText(await screen.findByLabelText(p.amount), '145');
  expect(screen.queryByText(p.attachments)).toBeNull();
  await method('cash');
  expect(screen.queryByText(p.attachments)).toBeNull();
  await method('bank');
  expect(screen.getByText(p.attachments)).toBeTruthy();
  for (const n of ['1', '2']) {
    await fireEvent.press(screen.getByRole('button', { name: p.mobile.pickPhoto }));
    expect(await screen.findByLabelText(p.attachmentN.replace('{n}', n))).toBeTruthy();
  }
  await fireEvent.press(screen.getByRole('button', { name: p.mobile.record }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockUpload).toHaveBeenCalledTimes(2);
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', '/payments', expect.objectContaining({
    method: 'bank',
    attachments: [`${SUB_ID}/a1.jpg`, `${SUB_ID}/a2.jpg`],
  }));
});

test('moving off the bank clears them: nothing uploaded, no attachments sent', async () => {
  await renderWithQuery(<PaymentScreen />);
  await fireEvent.changeText(await screen.findByLabelText(p.amount), '145');
  await method('bank');
  await fireEvent.press(screen.getByRole('button', { name: p.mobile.pickPhoto }));
  expect(await screen.findByLabelText(p.attachmentN.replace('{n}', '1'))).toBeTruthy();
  await method('cash');
  expect(screen.queryByText(p.attachments)).toBeNull();
  await method('bank');
  expect(screen.queryByLabelText(p.attachmentN.replace('{n}', '1'))).toBeNull();
  await method('cash');
  await fireEvent.press(screen.getByRole('button', { name: p.mobile.record }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/payments', expect.not.objectContaining({ attachments: expect.anything() }));
});
