import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { getDraft } from './draft-store';
import { FileComposer } from './FileComposer';
import { message, PHONE } from './inbox-fixture';
import { lastOwnSend } from './own-send';
import { clearTabMemories } from './tab-memory';
import { TextComposer } from './TextComposer';

const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'wa-media', path: 'out/u-1/r/abc.pdf', token: 'tok', signed_url: 'https://x' };
const PDF = new File([new Uint8Array(20)], 'جدول.pdf', { type: 'application/pdf' });
const SENT = message({ id: 'm-file', direction: 'outbound', status: 'sent', body: null, media_mime: 'application/pdf' });
let client: QueryClient;

/** The upload URL answers at once; POST /file answers with `send` (a promise or a row). */
function route(send: () => unknown) {
  apiSend.mockImplementation(async (_m: string, path: string) => (path.endsWith('/file-upload-url') ? SIGNED : send()));
}
const fileCalls = () => apiSend.mock.calls.filter(([, path]) => String(path).endsWith('/file'));
const show = (onDone = vi.fn(), withText = false) =>
  render(
    <QueryClientProvider client={client}>
      <section aria-label="file">
        <FileComposer phone={PHONE} file={PDF} onDone={onDone} />
      </section>
      {withText && (
        <section aria-label="text">
          <TextComposer phone={PHONE} />
        </section>
      )}
    </QueryClientProvider>,
  );
const sendButton = (area = 'file') => within(screen.getByRole('region', { name: area })).getByRole<HTMLButtonElement>('button', { name: area === 'file' ? t.inbox.composer.sendFile : t.inbox.composer.send });

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  uploadToSignedUrl.mockResolvedValue({ error: null });
});
afterEach(() => {
  apiSend.mockReset();
  uploadToSignedUrl.mockReset();
  clearTabMemories();
});

describe('FileComposer (D2)', () => {
  it('uploads, sends the path with the name and caption, records her own send and hands back', async () => {
    route(() => SENT);
    const onDone = vi.fn();
    show(onDone);
    expect(screen.getByText('جدول.pdf')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: t.inbox.composer.captionPlaceholder }), { target: { value: ' الجدول ' } });
    fireEvent.click(sendButton());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [, path, body] = fileCalls()[0] ?? [];
    expect(path).toBe('/threads/%2B966501234567/file');
    expect(body).toMatchObject({ path: SIGNED.path, filename: 'جدول.pdf', caption: 'الجدول' });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(SIGNED.path, 'tok', PDF, { contentType: 'application/pdf' });
    expect(lastOwnSend(PHONE)).toBe('m-file');
  });

  it('a failed send says why and the resend reuses its clientRequestId (rule 8)', async () => {
    route(() => Promise.reject(new ApiError(409, { code: 'session_closed' })));
    show();
    fireEvent.click(sendButton());
    expect((await screen.findByRole('alert')).textContent).toContain(t.inbox.error.session_closed);
    route(() => SENT);
    fireEvent.click(sendButton());
    await waitFor(() => expect(fileCalls()).toHaveLength(2));
    const ids = fileCalls().map(([, , body]) => (body as { clientRequestId: string }).clientRequestId);
    expect(ids[0]).toBe(ids[1]);
  });

  it('an image shows its thumbnail from an object URL, revoked on unmount', () => {
    const created = vi.fn(() => 'blob:thumb');
    const revoked = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked }));
    const png = new File([new Uint8Array(4)], 'صورة.png', { type: 'image/png' });
    const view = render(<QueryClientProvider client={client}><FileComposer phone={PHONE} file={png} onDone={vi.fn()} /></QueryClientProvider>);
    expect(screen.getByRole('img', { name: 'صورة.png' }).getAttribute('src')).toBe('blob:thumb');
    view.unmount();
    expect(revoked).toHaveBeenCalledWith('blob:thumb');
    vi.unstubAllGlobals();
  });

  it('a storage failure says «تعذّر رفع الملف» and sends nothing', async () => {
    route(() => SENT);
    uploadToSignedUrl.mockResolvedValue({ error: new Error('quota') });
    show();
    fireEvent.click(sendButton());
    expect((await screen.findByRole('alert')).textContent).toContain(t.inbox.error.file_upload);
    expect(fileCalls()).toHaveLength(0);
  });
});

describe('FileComposer: the chat’s send lock and sign-out', () => {
  it('shares the in-flight lock with the message box, both ways', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    route(() => new Promise((r) => (resolve = r)));
    show(vi.fn(), true);
    fireEvent.click(sendButton());
    await waitFor(() => expect(fileCalls()).toHaveLength(1));
    fireEvent.change(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel }), { target: { value: 'أهلًا' } });
    expect(sendButton('text').disabled).toBe(true);
    expect(sendButton().disabled).toBe(true);
    resolve(SENT);
    await waitFor(() => expect(sendButton('text').disabled).toBe(false));
  });

  it('a send settling after a sign-out leaves nothing in the next tab', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    route(() => new Promise((r) => (resolve = r)));
    const view = show();
    fireEvent.click(sendButton());
    await waitFor(() => expect(fileCalls()).toHaveLength(1));
    clearTabMemories();
    view.unmount();
    resolve(SENT);
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(lastOwnSend(PHONE)).toBeUndefined();
    expect(getDraft(PHONE)).toEqual({ text: '', failed: null });
  });
});
