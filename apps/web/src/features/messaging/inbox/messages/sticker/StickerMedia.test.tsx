import type { MessageView } from '@ab/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { MessageBubble } from '@/features/messaging/inbox/messages/components/MessageBubble';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';

// Stickers and GIFs in the chat (owner 2026-11-01): shown at once, a sticker with no bubble.
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));

const SIGNED = 'https://storage.test/wa-media/m-1.webp?token=x';
const NOW = new Date('2026-11-01T12:00:00Z');
const sticker = { id: 'm-1', body: null, media_mime: 'image/webp', interactive_payload: { type: 'sticker' } };
const gif = { id: 'm-1', body: null, direction: 'outbound' as const, media_mime: 'video/mp4', interactive_payload: { type: 'gif' } };

function show(patch: Partial<MessageView>, mode: InboxMode = 'admin') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <InboxModeContext value={mode}>
        <ul>
          <MessageBubble message={message(patch)} waitingTemplate={false} now={NOW} />
        </ul>
      </InboxModeContext>
    </QueryClientProvider>,
  );
}

describe('a sticker and a GIF in the chat', () => {
  afterEach(() => {
    cleanup();
    apiFetch.mockReset();
  });

  it('a sticker: signed at once, 150 px, uncut, no «تنزيل» and no bubble around it', async () => {
    apiFetch.mockResolvedValue({ url: SIGNED, expires_at: '2026-11-01T13:00:00Z', mime: 'image/webp' });
    show(sticker);
    const img = await screen.findByRole('img', { name: t.inbox.media.sticker });
    expect(img.getAttribute('src')).toBe(SIGNED);
    expect(img.style.width).toBe('150px');
    expect(screen.queryByRole('button', { name: new RegExp(t.inbox.download.action) })).toBeNull();
    const bubble = screen.getByRole('article');
    expect(bubble.className).toContain('bg-transparent');
    expect(bubble.className).toContain('border-0');
  });

  it('a GIF plays at once, muted and looping, in its bubble', async () => {
    apiFetch.mockResolvedValue({ url: SIGNED, expires_at: '2026-11-01T13:00:00Z', mime: 'video/mp4' });
    show(gif);
    const video = await screen.findByLabelText(t.inbox.media.gif);
    expect(video.tagName).toBe('VIDEO');
    expect(video.hasAttribute('autoplay')).toBe(true);
    expect(video.hasAttribute('loop')).toBe(true);
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect(screen.getByRole('article').className).not.toContain('bg-transparent');
  });

  it('teacher mode keeps the label and asks for no file', () => {
    show(sticker, 'teacher');
    expect(screen.getByText(`· ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
