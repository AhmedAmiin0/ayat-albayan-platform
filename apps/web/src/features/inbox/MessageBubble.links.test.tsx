import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { message } from './inbox-fixture';
import { MessageBubble } from './MessageBubble';
import { renderWithClient } from './test-utils';

vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

function renderBody(body: string) {
  renderWithClient(
    <ul>
      <MessageBubble message={message({ body })} waitingTemplate={false} now={new Date('2026-10-01T12:00:00Z')} />
    </ul>,
  );
  return screen.getByRole('article');
}

describe('MessageBubble links (W11)', () => {
  it('an http(s) link opens in a new tab, left to right, without the sentence dot', () => {
    const bubble = renderBody('رابط الحلقة https://meet.example/ab.');
    const link = within(bubble).getByRole('link', { name: 'https://meet.example/ab' });
    expect(link.getAttribute('href')).toBe('https://meet.example/ab');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('dir')).toBe('ltr');
    expect(link.parentElement?.textContent).toBe('رابط الحلقة https://meet.example/ab.');
  });

  it('javascript: and www. stay text', () => {
    const bubble = renderBody('javascript:alert(1) و www.x.com');
    expect(within(bubble).queryByRole('link')).toBeNull();
  });
});
