import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { balanceOf, page, payment, SUB_ID, subscription } from './fixtures';
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
jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const m = t.payments.mobile;
const signed = { bucket: 'receipts', path: `${SUB_ID}/9f.jpg`, token: 'tok', signed_url: 'http://x/sign' };
const listKey = ['payments', 'list', { studentId: 's1', pageSize: 5 }];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(balanceOf(subscription()));
  jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: 'granted',
    expires: 'never',
  } as Awaited<ReturnType<typeof ImagePicker.getCameraPermissionsAsync>>);
  // "hello": 5 bytes of compressed JPEG, as the picker hands it over.
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///cache/slip.jpg', width: 900, height: 1200, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
  });
});

async function fill(amount: string) {
  await fireEvent.changeText(await screen.findByLabelText(t.payments.amount), amount);
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.bank }));
}

test('header names the student; the package, what is paid of it, and its currency', async () => {
  await renderWithQuery(<PaymentScreen />);
  expect(await screen.findByRole('header', { name: 'دفعة لـهدى' })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/balance');
  expect(screen.getByText(/اتدفع/)).toBeTruthy();
  expect(screen.getByText(t.pricing.currencies.SAR)).toBeTruthy();
  expect(screen.queryByRole('radio', { checked: true })).toBeNull();
});

test('photo → signed upload → POST /payments with its path → back; the list showed it at once', async () => {
  let answer: (v: unknown) => void = () => undefined;
  mockApiSend.mockImplementation((_method: string, path: string) =>
    path === '/payments/receipt-upload-url' ? Promise.resolve(signed) : new Promise((r) => (answer = r)),
  );
  mockUpload.mockResolvedValue({ data: { path: signed.path }, error: null });
  const client = createTestQueryClient();
  client.setQueryData(listKey, page([payment()]));
  await renderWithQuery(<PaymentScreen />, client);
  await fill('١٤٥');
  await fireEvent.press(screen.getByRole('button', { name: m.takePhoto }));
  expect(await screen.findByLabelText(t.payments.receipt)).toBeTruthy();
  expect(screen.getByRole('button', { name: m.retake })).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: m.record }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect((client.getQueryData(listKey) as ReturnType<typeof page>).items).toHaveLength(2);
  expect(mockApiSend).toHaveBeenNthCalledWith(1, 'POST', '/payments/receipt-upload-url', {
    subscriptionId: SUB_ID,
    mime: 'image/jpeg',
    size: 5,
  });
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', expect.any(ArrayBuffer), {
    contentType: 'image/jpeg',
  });
  expect(mockApiSend).toHaveBeenLastCalledWith('POST', '/payments', {
    subscriptionId: SUB_ID,
    amount: 145,
    currency: 'SAR',
    method: 'bank',
    paidAt: expect.any(String),
    receiptPath: signed.path,
  });
  answer(payment({ id: 'p2' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});

test('no photo (cash): straight to POST /payments, no upload', async () => {
  mockApiSend.mockResolvedValue(payment({ id: 'p2', method: 'cash' }));
  await renderWithQuery(<PaymentScreen />);
  await fireEvent.changeText(await screen.findByLabelText(t.payments.amount), '50');
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.cash }));
  await fireEvent.press(screen.getByRole('button', { name: m.record }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/payments', expect.not.objectContaining({ receiptPath: expect.anything() }));
  expect(mockUpload).not.toHaveBeenCalled();
});

test('«يوم قبله» moves the day back to امبارح; «يوم بعده» only once off today', async () => {
  mockApiSend.mockResolvedValue(payment({ id: 'p2' }));
  await renderWithQuery(<PaymentScreen />);
  expect(await screen.findByText(new RegExp(`^${t.mobile.today} · `))).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.dayAfter })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: m.dayBefore }));
  expect(screen.getByText(new RegExp(`^${m.yesterday} · `))).toBeTruthy();
  await fill('145');
  await fireEvent.press(screen.getByRole('button', { name: m.record }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  const body = mockApiSend.mock.calls[0]?.[2] as { paidAt: string };
  expect(body.paidAt).toMatch(/T09:00:00\.000Z$/);
});
