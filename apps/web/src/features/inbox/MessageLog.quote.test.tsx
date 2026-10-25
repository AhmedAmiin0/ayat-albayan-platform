import { act, fireEvent, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from './ChatActionsProvider';
import { FLASH_MS } from './jump-to-message';
import { message, PHONE, thread } from './inbox-fixture';
import { MessageLog } from './MessageLog';
import { renderWithClient } from './test-utils';

const scrollIntoView = vi.fn();
const saved = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
});
afterAll(() => {
  if (saved) Object.defineProperty(Element.prototype, 'scrollIntoView', saved);
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});
afterEach(() => {
  scrollIntoView.mockReset();
  vi.useRealTimers();
});

const ORIGINAL = message({ id: 'orig', body: 'متى الحلقة؟\nوشكرًا', created_at: '2026-10-05T09:00:00Z' });
const quote = { id: 'orig', direction: 'inbound' as const, body: ORIGINAL.body, media_mime: null, template_key: null, sender_name: null };
const ANSWER = message({ id: 'ans', direction: 'outbound', status: 'sent', body: 'الخامسة', reply_to: quote, created_at: '2026-10-05T09:05:00Z' });
const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };

function renderLog(messages = [ORIGINAL, ANSWER]) {
  renderWithClient(
    <ChatActionsProvider thread={thread()} enabled>
      <MessageLog {...base} messages={messages} />
    </ChatActionsProvider>,
  );
}

const quoteButton = () => screen.getByRole('button', { name: (name) => name.includes(t.inbox.reply.jump) });

describe('a bubble that answers a message shows its quote', () => {
  it('the sender (the chat name for theirs) and the first line', () => {
    renderLog();
    const q = quoteButton();
    expect(q.textContent).toContain('أم سهيلة');
    expect(q.textContent).toContain('متى الحلقة؟');
    expect(q.textContent).not.toContain('وشكرًا');
  });

  it('a click scrolls the original into view, focuses it and highlights it for a moment', () => {
    vi.useFakeTimers();
    renderLog();
    fireEvent.click(quoteButton());
    const original = document.getElementById('msg-orig');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(original);
    expect(document.activeElement).toBe(original);
    expect(original?.hasAttribute('data-flash')).toBe(true);
    act(() => vi.advanceTimersByTime(FLASH_MS));
    expect(original?.hasAttribute('data-flash')).toBe(false);
  });

  it('an original older than the loaded pages: a polite notice, no scroll', () => {
    renderLog([ANSWER]);
    fireEvent.click(quoteButton());
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain(t.inbox.reply.notLoaded);
  });

  it('a forwarded message is labelled', () => {
    renderLog([message({ id: 'f', body: 'رابط الحلقة', forwarded: true })]);
    expect(screen.getByText(t.inbox.forward.forwarded)).toBeTruthy();
  });
});
