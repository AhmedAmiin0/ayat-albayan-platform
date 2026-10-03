import { afterEach, describe, expect, it, vi } from 'vitest';
import { invoicesQuery, makeupCandidatesQuery, threadMediaQuery, threadMediaUrl, uploadInvoiceFile } from './api.invoice';

const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from } } }));

const SIGNED = { bucket: 'invoices', path: 'req-1/abc.pdf', token: 'tok', signed_url: 'https://x' };

afterEach(() => {
  apiSend.mockReset();
  uploadToSignedUrl.mockReset();
  from.mockReset();
});

describe('uploadInvoiceFile', () => {
  it('asks for a signed URL for this request, uploads there with the file’s type, returns the path', async () => {
    apiSend.mockResolvedValue(SIGNED);
    from.mockReturnValue({ uploadToSignedUrl });
    uploadToSignedUrl.mockResolvedValue({ error: null });
    const file = new File([new Uint8Array(7)], 'inv.pdf', { type: 'application/pdf' });
    await expect(uploadInvoiceFile({ requestId: 'req-1', file })).resolves.toBe('req-1/abc.pdf');
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/invoice-upload-url', { clientRequestId: 'req-1', mime: 'application/pdf', size: 7 });
    expect(from).toHaveBeenCalledWith('invoices');
    expect(uploadToSignedUrl).toHaveBeenCalledWith('req-1/abc.pdf', 'tok', file, { contentType: 'application/pdf' });
  });

  it('throws the storage error so the field can say it failed', async () => {
    apiSend.mockResolvedValue(SIGNED);
    from.mockReturnValue({ uploadToSignedUrl });
    uploadToSignedUrl.mockResolvedValue({ error: new Error('quota') });
    await expect(uploadInvoiceFile({ requestId: 'req-1', file: new File(['x'], 'a.png', { type: 'image/png' }) })).rejects.toThrow('quota');
  });
});

describe('query keys', () => {
  it('encode the phone and ids, and key invoices by their filter', () => {
    expect(threadMediaQuery('+966501234567').queryKey).toEqual(['threads', '+966501234567', 'media']);
    expect(threadMediaUrl('+966501234567', 'm-1').queryKey.at(-1)).toBe('m-1');
    expect(makeupCandidatesQuery('s-1').queryKey).toEqual(['booking', 'makeup-candidates', 's-1']);
    expect(invoicesQuery({ ruleId: 'r-1' }).queryKey).toEqual(['invoices', 'ruleId=r-1']);
    expect(invoicesQuery({ studentId: 's-1' }).queryKey).toEqual(['invoices', 'studentId=s-1']);
  });
});
