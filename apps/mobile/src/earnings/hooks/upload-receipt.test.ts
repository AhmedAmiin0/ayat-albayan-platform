import { apiSend } from '@/core/lib/http/api';
import type { Receipt } from '@/payments/receipt';
import { ReceiptUploadError } from '@/payments/upload-receipt';
import { uploadTeacherReceipt } from './upload-receipt';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiSend: jest.fn() }));
const mockUpload = jest.fn();
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: mockUpload }) } } }));

const receipt: Receipt = { uri: 'file:///r.jpg', mime: 'image/jpeg', bytes: new ArrayBuffer(3), size: 3 };
const signed = { bucket: 'receipts', path: 't1/0b1c.jpg', token: 'tok', signed_url: 'u' };

beforeEach(() => jest.clearAllMocks());

test('signs under the teacher’s folder, uploads the bytes, returns the path', async () => {
  jest.mocked(apiSend).mockResolvedValue(signed);
  mockUpload.mockResolvedValue({ error: null });
  await expect(uploadTeacherReceipt('t1', receipt)).resolves.toBe('t1/0b1c.jpg');
  expect(apiSend).toHaveBeenCalledWith('POST', '/teacher-earnings/t1/receipt-upload-url', { mime: 'image/jpeg', size: 3 });
  expect(mockUpload).toHaveBeenCalledWith('t1/0b1c.jpg', 'tok', receipt.bytes, { contentType: 'image/jpeg' });
});

test('Storage refuses the file: ReceiptUploadError', async () => {
  jest.mocked(apiSend).mockResolvedValue(signed);
  mockUpload.mockResolvedValue({ error: new Error('mime') });
  await expect(uploadTeacherReceipt('t1', receipt)).rejects.toBeInstanceOf(ReceiptUploadError);
});
