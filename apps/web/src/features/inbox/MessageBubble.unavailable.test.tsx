import type { MessageView } from '@ab/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { message } from './inbox-fixture';
import { MessageBubble } from './MessageBubble';
import { emptyText } from './MessageContent';
import { renderWithClient } from './test-utils';

vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

// A lead's first message arrived as Meta's `unsupported` (owner 2026-10-25): no body, no file.
const NOW = new Date('2026-10-01T12:00:00Z');
const unsupported = (code: number) => ({ type: 'unsupported', errors: [{ code }], unsupported: { type: 'unknown' } });

function renderBubble(patch: Partial<MessageView>) {
  renderWithClient(
    <ul>
      <MessageBubble message={message({ direction: 'inbound', body: null, ...patch })} waitingTemplate={false} now={NOW} />
    </ul>,
  );
  return screen.getByRole('article');
}

describe('MessageBubble: a message whose content never reached us', () => {
  it('Meta’s 131060 says «هذه الرسالة غير متاحة» and to ask for it again', () => {
    const bubble = renderBubble({ interactive_payload: unsupported(131060) });
    expect(bubble.textContent).toContain(t.inbox.unavailable);
  });

  it('any other unsupported row asks the sender to send it again, never to open WhatsApp', () => {
    const bubble = renderBubble({ interactive_payload: unsupported(131051) });
    expect(bubble.textContent).toContain(t.inbox.unsupported);
    expect(t.inbox.unsupported).not.toMatch(/افتحها/);
  });

  it('emptyText: the same two lines (mobile shares the keys)', () => {
    expect(emptyText({ interactive_payload: unsupported(131060) })).toBe(t.inbox.unavailable);
    expect(emptyText({ interactive_payload: unsupported(131051) })).toBe(t.inbox.unsupported);
    expect(emptyText({ interactive_payload: null })).toBe(t.inbox.media.other);
    // A contact card did arrive: it cannot be shown here, but nobody is asked to send it again.
    expect(emptyText({ interactive_payload: { type: 'contacts', contacts: [] } })).toBe(t.inbox.media.other);
  });
});
