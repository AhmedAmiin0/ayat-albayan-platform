import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { mediaCardLabel } from './ChatMediaPicker';
import type { ThreadMediaItem } from './contract';
import type { InvoiceDraft } from './draft';
import { InvoiceField } from './InvoiceField';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const PHONE = '+966501234567';
const GOOD: InvoiceDraft = { source: 'upload', path: 'req-1/a.png', name: 'first.png', mime: 'image/png', preview: 'blob:first' };
const PHOTO: ThreadMediaItem = { message_id: 'm-1', created_at: '2026-10-02T10:00:00.000Z', mime: 'image/jpeg', caption: null, expired: false };
const file = (type: string, name = 'inv.png') => new File([new Uint8Array(10)], name, { type });

/** The field with its value held by a parent, as the wizard does; `seen` records every onChange. */
function renderField(initial: InvoiceDraft | null) {
  const seen: (InvoiceDraft | null)[] = [];
  function Host() {
    const [value, setValue] = useState(initial);
    return <InvoiceField value={value} requestId="req-1" chatPhone={PHONE} onChange={(v) => (seen.push(v), setValue(v))} />;
  }
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Host />
    </QueryClientProvider>,
  );
  return seen;
}
const choose = (f: File) => fireEvent.change(screen.getByLabelText(t.booking.invoice.replace), { target: { files: [f] } });

describe('InvoiceField: replacing and removing (R-PAY-03)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:second');
    apiSend.mockResolvedValue({ bucket: 'invoices', path: 'req-1/b.png', token: 'tok', signed_url: 'https://x' });
    apiFetch.mockImplementation(async (path: string) =>
      path.endsWith('/media') ? [PHOTO] : { url: 'https://signed/m-1', mime: 'image/jpeg', expires_at: '2026-10-03T10:00:00.000Z' },
    );
  });
  afterEach(() => {
    apiSend.mockReset();
    apiFetch.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('a failed replace keeps the first invoice on screen', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error('boom') });
    const seen = renderField(GOOD);
    choose(file('image/png', 'second.png'));
    expect((await screen.findByRole('alert')).textContent).toBe(t.common.error);
    expect(seen).toEqual([]);
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:first');
  });

  it('a good replace swaps it once it landed, with the new thumbnail', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null });
    const seen = renderField(GOOD);
    choose(file('image/png', 'second.png'));
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('blob:second'));
    expect(seen).toHaveLength(1);
  });

  it('while a file goes up both ways of choosing are off and the old thumbnail stays', async () => {
    let finish: (v: { error: null }) => void = () => undefined;
    uploadToSignedUrl.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderField(GOOD);
    choose(file('image/png', 'second.png'));
    expect((await screen.findByRole('status')).textContent).toContain(t.booking.invoice.uploading);
    expect(screen.getByRole('button', { name: t.booking.invoice.fromChat }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:first');
    finish({ error: null });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('a chat pick after a failed upload clears the red error', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error('boom') });
    renderField(null);
    fireEvent.change(screen.getByLabelText(t.booking.invoice.upload), { target: { files: [file('image/png')] } });
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: t.booking.invoice.fromChat }));
    fireEvent.click(await screen.findByRole('button', { name: mediaCardLabel(PHOTO) }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText(t.booking.invoice.sourceWhatsapp)).toBeTruthy();
  });

  it('«شيلها» clears the error and the invoice', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error('boom') });
    renderField(GOOD);
    choose(file('image/png'));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: t.booking.invoice.remove }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('a .heic from Windows Chrome (no type) is accepted by its extension, labelled image/heic, shown as a tile', async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null });
    renderField(null);
    fireEvent.change(screen.getByLabelText(t.booking.invoice.upload), { target: { files: [file('', 'IMG_1.HEIC')] } });
    await waitFor(() => expect(screen.getByText('IMG_1.HEIC')).toBeTruthy());
    expect(apiSend).toHaveBeenCalledWith('POST', '/booking/invoice-upload-url', expect.objectContaining({ mime: 'image/heic' }));
    expect(screen.queryByRole('img')).toBeNull();
  });
});
