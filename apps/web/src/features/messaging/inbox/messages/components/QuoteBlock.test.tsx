import { UNAVAILABLE_QUOTE, type MessageQuote, type ReplyQuote } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { threadFileQuery } from '@/features/messaging/inbox/api/api';
import { threadPdfPageQuery } from '@/features/messaging/inbox/api/api.files';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import { ChatActionsProvider } from '@/features/messaging/inbox/shared/ChatActionsProvider';
import { PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { QuoteBlock } from './QuoteBlock';

// The quote on top of a bubble, WhatsApp's look (owner 2026-10-31): sender, snippet, icon, thumb,
// and «رسالة غير متاحة» for a message WhatsApp quoted that we never stored.
vi.mock('@/features/messaging/inbox/messages/lib/jump-to-message', () => ({ jumpToMessage: vi.fn(() => true) }));

const quote = (patch: Partial<MessageQuote> = {}): MessageQuote => ({
  id: 'q1',
  direction: 'inbound',
  body: 'متى الحلقة؟',
  media_mime: null,
  template_key: null,
  sender_name: null,
  ...patch,
});

function show(q: ReplyQuote) {
  return renderWithClient(
    <ChatActionsProvider thread={thread()} enabled>
      <QuoteBlock quote={q} outbound={false} />
    </ChatActionsProvider>,
  );
}
const box = () => screen.getByRole('button', { name: (n) => n.includes(t.inbox.reply.jump) });
const SIGNED = { url: 'https://files.test/q.jpg', expires_at: '2026-10-31T10:00:00Z' };

describe('QuoteBlock', () => {
  it('theirs: the name of the chat', () => {
    show(quote());
    expect(box().textContent).toContain('أم سهيلة');
  });

  it('ours: «أنت» when no staff name is known', () => {
    show(quote({ direction: 'outbound' }));
    expect(box().textContent).toContain(t.inbox.reply.you);
  });

  it('ours: the staff member who sent it', () => {
    show(quote({ direction: 'outbound', sender_name: 'سارة' }));
    expect(box().textContent).toContain('سارة');
  });

  it.each([
    ['image/jpeg', `📷 ${t.inbox.media.image}`],
    ['application/pdf', `📄 ${t.inbox.media.pdf}`],
    ['audio/ogg; codecs=opus', `🎤 ${t.inbox.media.audio}`],
  ])('a file with no caption (%s) shows its icon and kind', (media_mime, line) => {
    show(quote({ body: null, media_mime }));
    expect(box().textContent).toContain(line);
  });

  it('a photo shows its thumb once the bubble opened it (read from the cache only)', () => {
    const client = show(quote({ id: 'p1', body: null, media_mime: 'image/jpeg' }));
    expect(document.querySelector('img')).toBeNull();
    const key = threadFileQuery(PHONE, 'p1').queryKey;
    act(() => {
      client.setQueryData(key, { ...SIGNED, mime: 'image/jpeg' });
    });
    expect(document.querySelector('img')?.getAttribute('src')).toBe(SIGNED.url);
  });

  it('a PDF shows page 1 once the bubble rendered it', () => {
    const client = show(quote({ id: 'd1', body: 'الفاتورة', media_mime: 'application/pdf' }));
    const key = threadPdfPageQuery(PHONE, 'd1', 1).queryKey;
    act(() => {
      client.setQueryData(key, { ...SIGNED, page: 1, pages: 2, bytes: 900 });
    });
    expect(document.querySelector('img')?.getAttribute('src')).toBe(SIGNED.url);
    expect(box().textContent).toContain('📄 الفاتورة');
  });

  it('a click jumps to the original', () => {
    show(quote());
    fireEvent.click(box());
    expect(jumpToMessage).toHaveBeenCalledWith('q1');
  });

  it('unavailable: «رسالة غير متاحة», greyed, nothing to click', () => {
    show(UNAVAILABLE_QUOTE);
    const line = screen.getByText(t.inbox.reply.unavailable);
    expect(line.tagName).toBe('P');
    expect(line.className).toContain('text-ink-3');
    expect(line.closest('button')).toBeNull();
  });
});
