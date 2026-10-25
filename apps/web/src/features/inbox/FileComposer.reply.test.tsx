import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { ChatActionsContext, type ChatActions } from './chat-actions';
import { FileComposer } from './FileComposer';
import { message, PHONE } from './inbox-fixture';
import { clearTabMemories } from './tab-memory';

const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl }) } } }));

const SIGNED = { bucket: 'wa-media', path: 'out/u-1/r/abc.pdf', token: 'tok', signed_url: 'https://x' };
const PDF = new File([new Uint8Array(20)], 'جدول.pdf', { type: 'application/pdf' });
const ID = '0d9b2c64-1f3e-4b7a-8c5d-6e7f8a9b0c1d';
const QUOTE = { id: ID, direction: 'outbound' as const, body: null, media_mime: 'image/png', template_key: null, sender_name: 'سارة' };

function show(cancelReply = vi.fn()) {
  const value: ChatActions = {
    enabled: true,
    chat: { name: 'أم سهيلة', phone: PHONE },
    replyBlocked: null,
    target: QUOTE,
    reply: vi.fn(),
    cancelReply,
    forward: vi.fn(),
    notLoaded: vi.fn(),
  };
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ChatActionsContext.Provider value={value}>
        <FileComposer phone={PHONE} file={PDF} onDone={vi.fn()} />
      </ChatActionsContext.Provider>
    </QueryClientProvider>,
  );
  return cancelReply;
}

afterEach(() => {
  apiSend.mockReset();
  clearTabMemories();
});

describe('FileComposer answering a message («رد»)', () => {
  it('shows the strip (our sender, the file kind), focuses the caption and sends replyToMessageId', async () => {
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path.endsWith('/file-upload-url') ? SIGNED : message({ id: 'm-f', direction: 'outbound', status: 'sent' }),
    );
    const cancel = show();
    const strip = screen.getByRole('group', { name: t.inbox.reply.strip });
    expect(strip.textContent).toContain('سارة');
    expect(strip.textContent).toContain(t.inbox.media.image);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: t.inbox.composer.captionPlaceholder }));
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendFile }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(ID));
    const call = apiSend.mock.calls.find(([, path]) => String(path).endsWith('/file'));
    expect(call?.[2]).toMatchObject({ path: SIGNED.path, replyToMessageId: ID });
  });
});
