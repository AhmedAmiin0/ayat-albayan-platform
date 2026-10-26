import type { MessageView } from '@ab/shared';
import { cleanup, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { message } from '../../testing/inbox-fixture';
import { MessageBubble } from './MessageBubble';
import { renderWithClient } from '../../testing/test-utils';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const NOW = new Date('2026-10-01T12:00:00Z');

/** jsdom applies no CSS: resolve the row's flex classes for a page direction as a browser would. */
function screenSide(row: HTMLElement, dir: 'rtl' | 'ltr'): 'left' | 'right' {
  const cls = row.className.split(/\s+/);
  const reversed = cls.includes(`${dir}:flex-row-reverse`) || cls.includes('flex-row-reverse');
  // The main axis runs right to left on an RTL page, and flips again when reversed.
  const leftToRight = (dir === 'ltr') !== reversed;
  const atEnd = cls.includes('justify-end');
  return atEnd === leftToRight ? 'right' : 'left';
}

function row(patch: Partial<MessageView>) {
  cleanup();
  renderWithClient(
    <ul>
      <MessageBubble message={message({ body: 'أهلًا', ...patch })} waitingTemplate={false} now={NOW} />
    </ul>,
  );
  const li = screen.getByRole('article').closest('li');
  if (!li) throw new Error('no row');
  return li;
}

describe('MessageBubble sides as WhatsApp (owner 2026-10-26)', () => {
  it.each(['rtl', 'ltr'] as const)('%s: ours on the right, theirs on the left', (dir) => {
    expect(screenSide(row({ direction: 'outbound', status: 'sent' }), dir)).toBe('right');
    expect(screenSide(row({ direction: 'inbound' }), dir)).toBe('left');
  });

  it('the tail corner is physical: top-right for ours, top-left for theirs', () => {
    const ours = row({ direction: 'outbound', status: 'sent' }).querySelector('article');
    const theirs = row({ direction: 'inbound' }).querySelector('article');
    expect(ours?.className).toContain('rounded-tr-sm');
    expect(theirs?.className).toContain('rounded-tl-sm');
  });

  it('the text keeps its own direction (dir=auto), whatever the side', () => {
    const p = row({ direction: 'outbound', status: 'sent' }).querySelector('p[dir="auto"]');
    expect(p?.textContent).toBe('أهلًا');
  });
});
