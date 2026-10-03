import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { InvoiceDraft } from './draft';
import { InvoiceField } from './InvoiceField';
import { invoiceProblem } from './invoice-file';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'invoices', path: 'req-1/abc.png', token: 'tok', signed_url: 'https://x' };
const file = (type: string, name = 'inv', size = 10) => new File([new Uint8Array(size)], name, { type });

function renderField(over: { value?: InvoiceDraft | null; chatPhone?: string | null } = {}) {
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InvoiceField value={over.value ?? null} requestId="req-1" chatPhone={over.chatPhone ?? null} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}
const choose = (f: File) =>
  fireEvent.change(screen.getByLabelText(t.booking.invoice.upload), { target: { files: [f] } });

describe('InvoiceField (R-PAY-03)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:inv');
    apiSend.mockResolvedValue(SIGNED);
    uploadToSignedUrl.mockResolvedValue({ error: null });
  });
  afterEach(() => {
    apiSend.mockReset();
    apiFetch.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('is marked required, with its hint', () => {
    renderField();
    expect(screen.getByText(t.booking.invoice.label).textContent).toContain('*');
    expect(screen.getByText(t.booking.invoice.hint)).toBeTruthy();
    expect(screen.getByLabelText(t.booking.invoice.upload).hasAttribute('aria-required')).toBe(true);
  });

  it('uploads an image at once through a signed URL and reports the path with its preview', async () => {
    const onChange = renderField();
    choose(file('image/png', 'receipt.png'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({
      source: 'upload',
      path: 'req-1/abc.png',
      name: 'receipt.png',
      mime: 'image/png',
      preview: 'blob:inv',
    }));
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/invoice-upload-url', { clientRequestId: 'req-1', mime: 'image/png', size: 10 });
    expect(uploadToSignedUrl).toHaveBeenCalledWith('req-1/abc.png', 'tok', expect.any(File), { contentType: 'image/png' });
  });

  it('a PDF is accepted and shown as a tile with its name, not an image', () => {
    renderField({ value: { source: 'upload', path: 'p', name: 'inv.pdf', mime: 'application/pdf', preview: null } });
    expect(screen.getByText(t.booking.invoice.pdf)).toBeTruthy();
    expect(screen.getByText('inv.pdf')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('refuses a wrong type or a file over 10 MB before any upload, in Arabic', () => {
    renderField();
    choose(file('audio/mpeg'));
    expect(screen.getByRole('alert').textContent).toBe(t.booking.error.invoice_type);
    choose(file('application/pdf', 'big.pdf', 10 * 1024 * 1024 + 1));
    expect(screen.getByRole('alert').textContent).toBe(t.booking.error.invoice_too_large);
    expect(apiSend).not.toHaveBeenCalled();
    expect(invoiceProblem(null)).toBeNull();
    expect(invoiceProblem(file('image/heic'))).toBeNull();
  });

  it('says why a failed upload failed and keeps no invoice', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error('boom') });
    const onChange = renderField();
    choose(file('image/png'));
    expect((await screen.findByRole('alert')).textContent).toBe(t.common.error);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('«شيلها» removes it, «غيّرها» replaces it', () => {
    const onChange = renderField({ value: { source: 'whatsapp', messageId: 'm-1', mime: 'image/png', preview: 'blob:x' } });
    expect(screen.getByLabelText(t.booking.invoice.replace)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.invoice.remove }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('«من الشات» shows only when the family’s number is known', () => {
    renderField();
    expect(screen.queryByRole('button', { name: t.booking.invoice.fromChat })).toBeNull();
  });
});
