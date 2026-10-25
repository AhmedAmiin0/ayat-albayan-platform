import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { thread } from './testing/inbox-fixture';
import { renderWithClient } from './testing/test-utils';
import { ThreadRow } from './ThreadRow';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

function renderRow(patch: Parameters<typeof thread>[0]) {
  renderWithClient(
    <ul>
      <ThreadRow thread={thread(patch)} search={{ page: 1 }} active={false} />
    </ul>,
  );
  return screen.getByRole('link');
}

describe('ThreadRow ticks (WhatsApp-style list)', () => {
  it('our last message: its ticks before the preview, named by the status', () => {
    const row = renderRow({ last_direction: 'outbound', last_status: 'read', last_body: 'أهلًا', unread_count: 0 });
    const ticks = within(row).getByRole('img', { name: t.enums.messageStatus.read });
    expect(ticks.getAttribute('data-ticks')).toBe('read');
    expect(ticks.nextElementSibling?.textContent).toContain('أهلًا');
  });

  it('the link names our last status, since its label replaces the ticks\' own name', () => {
    const row = renderRow({ last_direction: 'outbound', last_status: 'delivered', unread_count: 0 });
    expect(screen.getByRole('link', { name: new RegExp(t.enums.messageStatus.delivered) })).toBe(row);
  });

  it('a failed last send is named once, by the row\'s turn («لم تُرسل آخر رسالة»)', () => {
    const row = renderRow({ last_direction: 'outbound', last_status: 'failed' });
    expect(row.getAttribute('aria-label')?.split(t.enums.messageStatus.failed)).toHaveLength(2);
  });

  it('their last message shows no ticks; the unread count stays', () => {
    const row = renderRow({ last_direction: 'inbound', last_status: 'delivered', unread_count: 2 });
    expect(within(row).queryByRole('img')).toBeNull();
    expect(within(row).getByText(t.inbox.unread.two)).toBeTruthy();
  });

  it('a failed last send: the saffron «!» and the «لم تُرسل» word both stay', () => {
    const row = renderRow({ last_direction: 'outbound', last_status: 'failed' });
    expect(within(row).getByRole('img', { name: t.enums.messageStatus.failed }).getAttribute('data-ticks')).toBe('failed');
    expect(within(row).getByText(t.enums.messageStatus.failed)).toBeTruthy();
  });
});
