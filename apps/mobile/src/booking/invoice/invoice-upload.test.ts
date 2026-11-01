import { apiSend } from '@/core/lib/http/api';
import type { Receipt } from '@/core/lib/receipts/receipt';
import { InvoiceUploadError, uploadInvoice } from './invoice-upload';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiSend: jest.fn() }));
const mockUpload = jest.fn();
const mockFrom = jest.fn((bucket: string) => ({ bucket, uploadToSignedUrl: mockUpload }));
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { storage: { from: (b: string) => mockFrom(b) } } }));

const send = jest.mocked(apiSend);
const REQ = '99999999-9999-4999-8999-999999999999';
const receipt: Receipt = {
  uri: 'file:///cache/invoice.jpg',
  mime: 'image/jpeg',
  bytes: new Uint8Array([1, 2, 3]).buffer,
  size: 3,
};
const signed = { bucket: 'invoices', path: `${REQ}/0b1c.jpg`, token: 'tok', signed_url: 'http://127.0.0.1/x?token=tok' };

beforeEach(() => jest.clearAllMocks());

test('asks the API to sign {requestId}/{uuid}.ext, uploads the bytes into `invoices`, returns the path', async () => {
  send.mockResolvedValue(signed);
  mockUpload.mockResolvedValue({ data: { path: signed.path }, error: null });
  await expect(uploadInvoice(REQ, receipt)).resolves.toBe(signed.path);
  expect(send).toHaveBeenCalledWith('POST', '/booking/invoice-upload-url', {
    clientRequestId: REQ,
    mime: 'image/jpeg',
    size: 3,
  });
  expect(mockFrom).toHaveBeenCalledWith('invoices');
  expect(mockUpload).toHaveBeenCalledWith(signed.path, 'tok', receipt.bytes, { contentType: 'image/jpeg' });
});

test('Storage refuses: InvoiceUploadError; the API unreachable: its error, nothing uploaded', async () => {
  send.mockResolvedValueOnce(signed);
  mockUpload.mockResolvedValue({ data: null, error: new Error('mime type not supported') });
  await expect(uploadInvoice(REQ, receipt)).rejects.toBeInstanceOf(InvoiceUploadError);
  jest.clearAllMocks();
  send.mockRejectedValue(new TypeError('Network request failed'));
  await expect(uploadInvoice(REQ, receipt)).rejects.toBeInstanceOf(TypeError);
  expect(mockUpload).not.toHaveBeenCalled();
});
