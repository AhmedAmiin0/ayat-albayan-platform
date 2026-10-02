import { apiSend } from '@/lib/api';
import { SUB_ID } from './fixtures';
import type { Receipt } from './receipt';
import { ReceiptUploadError, uploadReceipt } from './upload-receipt';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiSend: jest.fn() }));
const mockUpload = jest.fn();
const mockFrom = jest.fn((bucket: string) => ({ bucket, uploadToSignedUrl: mockUpload }));
jest.mock('@/lib/supabase', () => ({ supabase: { storage: { from: (b: string) => mockFrom(b) } } }));

const send = jest.mocked(apiSend);
const receipt: Receipt = {
  uri: 'file:///cache/receipt.jpg',
  mime: 'image/jpeg',
  bytes: new Uint8Array([1, 2, 3]).buffer,
  size: 3,
};
const signed = {
  bucket: 'receipts',
  path: `${SUB_ID}/0b1c.jpg`,
  token: 'tok',
  signed_url: 'http://127.0.0.1:54321/storage/v1/object/upload/sign/receipts/x?token=tok',
};

beforeEach(() => jest.clearAllMocks());

test('asks the API for a signed path, uploads the bytes there, returns the path', async () => {
  send.mockResolvedValue(signed);
  mockUpload.mockResolvedValue({ data: { path: signed.path }, error: null });
  await expect(uploadReceipt(SUB_ID, receipt)).resolves.toBe(signed.path);
  expect(send).toHaveBeenCalledWith('POST', '/payments/receipt-upload-url', {
    subscriptionId: SUB_ID,
    mime: 'image/jpeg',
    size: 3,
  });
  expect(mockFrom).toHaveBeenCalledWith('receipts');
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', receipt.bytes, {
    contentType: 'image/jpeg',
  });
});

test('Storage refuses the file: ReceiptUploadError', async () => {
  send.mockResolvedValue(signed);
  mockUpload.mockResolvedValue({ data: null, error: new Error('mime type not supported') });
  await expect(uploadReceipt(SUB_ID, receipt)).rejects.toBeInstanceOf(ReceiptUploadError);
});

test('the API refuses to sign: its error, nothing uploaded', async () => {
  send.mockRejectedValue(new TypeError('Network request failed'));
  await expect(uploadReceipt(SUB_ID, receipt)).rejects.toBeInstanceOf(TypeError);
  expect(mockUpload).not.toHaveBeenCalled();
});
