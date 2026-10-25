import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesPayment, SUB } from './fixtures';
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
const nth = (n: number) => m.attachmentN.replace('{n}', String(n));
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
let picked = 0;
let signedCount = 0;

beforeEach(() => {
  jest.clearAllMocks();
  picked = 0;
  signedCount = 0;
  mockApiFetch.mockResolvedValue(familyOf(kid({ open: [openSub()] })));
  mockUpload.mockResolvedValue({ data: {}, error: null });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockImplementation(async () => {
    picked += 1;
    return {
      canceled: false,
      assets: [{ uri: `file:///cache/slip-${picked}.jpg`, width: 9, height: 12, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
    };
  });
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path !== '/sales/payments/receipt-upload-url') return salesPayment('active');
    signedCount += 1;
    return { bucket: 'receipts', path: `${SUB}/f${signedCount}.jpg`, token: 'tok', signed_url: 'http://x/s' };
  });
});

const addPhoto = async () => fireEvent.press(await screen.findByRole('button', { name: m.receiptLibrary }));

test('two photos: each is uploaded once and both paths go in attachments, in order', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  await addPhoto();
  expect(await screen.findByText(nth(1))).toBeTruthy();
  await addPhoto();
  expect(await screen.findByText(nth(2))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.becameSubscribed)).toBeTruthy();
  expect(mockUpload).toHaveBeenCalledTimes(2);
  expect(sent('/sales/payments')[0]?.[2]).toMatchObject({ attachments: [`${SUB}/f1.jpg`, `${SUB}/f2.jpg`] });
});

test('one removed before saving: only the other is uploaded and sent', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  await addPhoto();
  await addPhoto();
  await fireEvent.press(await screen.findByRole('button', { name: `${m.attachmentRemove} · ${nth(1)}` }));
  await waitFor(() => expect(screen.queryByText(nth(2))).toBeNull());
  await fireEvent.press(screen.getByRole('button', { name: m.saveTransfer }));
  expect(await screen.findByText(m.becameSubscribed)).toBeTruthy();
  expect(sent('/sales/payments/receipt-upload-url')).toHaveLength(1);
  expect(sent('/sales/payments')[0]?.[2]).toMatchObject({ attachments: [`${SUB}/f1.jpg`] });
});

test('five at most: the add buttons give way to «الحد الأقصى 5 مرفقات»', async () => {
  await renderWithQuery(<SalesTransferScreen />);
  for (let i = 1; i <= 5; i += 1) {
    await addPhoto();
    expect(await screen.findByText(nth(i))).toBeTruthy();
  }
  expect(screen.getByText(m.attachmentsMax)).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.receiptLibrary })).toBeNull();
  expect(screen.queryByRole('button', { name: m.receiptFromChat })).toBeNull();
});
