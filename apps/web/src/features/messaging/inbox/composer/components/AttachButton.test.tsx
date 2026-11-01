import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ComposerPhone } from './ComposerPhone';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) }, storage: { from: vi.fn() } },
}));

const MB = 1024 * 1024;
const props = { context: {}, gateNote: null, mode: 'text' as const, onMode: vi.fn(), teacher: false };
const clip = () => screen.queryByRole('button', { name: t.inbox.composer.attach });
const fileInput = (): HTMLInputElement => {
  const el = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!el) throw new Error('no file input');
  return el;
};
const pick = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } });
const sized = (bytes: number, name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

function show(input: { mode: InboxMode; open: boolean; permissions?: string[] }) {
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role: input.mode, permissions: input.permissions ?? ['inbox.send', 'messages.read'] }],
    ['/messaging/templates', []],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value={input.mode}>
      <ComposerPhone thread={thread({ session_open: input.open, last_inbound_at: new Date().toISOString() })} {...props} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('AttachButton: who gets the paperclip (D2)', () => {
  it('sales inside the window gets it, taking JPEG, PNG and PDF', async () => {
    show({ mode: 'sales', open: true });
    await waitFor(() => expect(clip()).toBeTruthy());
    expect(fileInput().accept).toBe('image/jpeg,image/png,application/pdf');
  });

  it('a teacher never gets it', async () => {
    show({ mode: 'teacher', open: true });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/auth/me'));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
    expect(clip()).toBeNull();
  });

  it('a closed window hides it', async () => {
    show({ mode: 'sales', open: false });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/auth/me'));
    expect(clip()).toBeNull();
  });
});

describe('AttachButton: the client-side check', () => {
  it('a PNG over Meta’s 5 MB says so and keeps the message box', async () => {
    show({ mode: 'admin', open: true });
    await waitFor(() => expect(clip()).toBeTruthy());
    pick(sized(5 * MB + 1, 'big.png', 'image/png'));
    expect((await screen.findByRole('alert')).textContent).toBe(t.inbox.error.file_too_large);
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
  });

  it('a WebP is refused with file_type', async () => {
    show({ mode: 'admin', open: true });
    await waitFor(() => expect(clip()).toBeTruthy());
    pick(sized(10, 'a.webp', 'image/webp'));
    expect((await screen.findByRole('alert')).textContent).toBe(t.inbox.error.file_type);
  });

  it('a PDF within the limit swaps the box for the file composer; «إزالة الملف» brings it back', async () => {
    show({ mode: 'sales', open: true });
    await waitFor(() => expect(clip()).toBeTruthy());
    pick(sized(2 * MB, 'جدول.pdf', 'application/pdf'));
    expect(await screen.findByText('جدول.pdf')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeNull();
    expect(screen.getByRole('textbox', { name: t.inbox.composer.captionPlaceholder })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.removeFile }));
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
    expect(screen.queryByText('جدول.pdf')).toBeNull();
  });
});
