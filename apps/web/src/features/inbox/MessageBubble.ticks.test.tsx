import { MESSAGE_STATUSES, type MessageStatus, type MessageView } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { message } from './inbox-fixture';
import { MessageBubble } from './MessageBubble';
import { renderWithClient } from './test-utils';

vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const NOW = new Date('2026-10-01T12:00:00Z');
const KIND: Record<MessageStatus, string> = {
  queued: 'pending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  sent_manually: 'manual',
};

function renderBubble(patch: Partial<MessageView>) {
  renderWithClient(
    <ul>
      <MessageBubble message={message({ direction: 'outbound', body: 'أهلًا', ...patch })} waitingTemplate={false} now={NOW} />
    </ul>,
  );
  return screen.getByRole('article');
}

describe('MessageBubble delivery ticks (WhatsApp-style)', () => {
  it.each(MESSAGE_STATUSES)('%s: one image named by its status word, no chip', (status) => {
    const bubble = renderBubble({ status });
    const ticks = within(bubble).getByRole('img', { name: t.enums.messageStatus[status] });
    expect(ticks.getAttribute('data-ticks')).toBe(KIND[status]);
    expect(bubble.querySelector('[data-tone]')).toBeNull();
  });

  it('ticks sit right after the time, at the end of the footer', () => {
    const footer = renderBubble({ status: 'sent' }).querySelector('footer');
    const last = footer?.lastElementChild;
    expect(last?.getAttribute('role')).toBe('img');
    expect(last?.previousElementSibling?.tagName).toBe('TIME');
  });

  it('read is drawn in the read colour; delivered and sent in the tick grey', () => {
    expect(within(renderBubble({ status: 'read' })).getByRole('img').getAttribute('class')).toContain('text-read');
    document.body.innerHTML = '';
    expect(within(renderBubble({ status: 'delivered' })).getByRole('img').getAttribute('class')).toContain('text-tick');
  });

  it('the delivery times are the tooltip', () => {
    const bubble = renderBubble({ status: 'read', sent_at: '2026-10-01T10:00:00Z', read_at: '2026-10-01T10:05:00Z' });
    const title = within(bubble).getByRole('img').getAttribute('title') ?? '';
    expect(title).toContain(t.messages.readAt.split('{time}')[0] ?? '');
    expect(title).toContain(' · ');
  });

  it('sent by hand keeps «يدويًا» beside its two ticks, in the muted text ink (AA), not the tick grey', () => {
    const ticks = within(renderBubble({ status: 'sent_manually' })).getByRole('img');
    expect(ticks.textContent).toBe(t.messages.manualTick);
    expect(within(ticks).getByText(t.messages.manualTick).getAttribute('class')).toContain('text-ink-3');
  });

  it('failed says «لم تُرسل» beside its «!», as on mobile', () => {
    expect(within(renderBubble({ status: 'failed' })).getByRole('img').textContent).toBe(t.enums.messageStatus.failed);
  });

  it('failed keeps its reason line and the admin actions', () => {
    const bubble = renderBubble({ status: 'failed', error_code: '131049', click_to_chat: 'https://wa.me/1?text=x' });
    expect(within(bubble).getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131049']))).toBeTruthy();
    expect(within(bubble).getByRole('button', { name: t.messages.retry })).toBeTruthy();
    expect(within(bubble).getByRole('img').getAttribute('class')).toContain('text-act');
  });

  it('theirs carries no ticks', () => {
    expect(within(renderBubble({ direction: 'inbound' })).queryByRole('img')).toBeNull();
  });
});
