import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxModeContext, type InboxMode } from '../mode';
import { ThreadListChips } from './ThreadListChips';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../testing/test-utils')).MockLink }));

const PHONE = '+966501234567';
const PAY = { id: '0c000000-0000-4000-8000-000000000001', name: 'بانتظار الدفع' };

function show(mode: InboxMode, lists = [PAY]) {
  render(
    <InboxModeContext.Provider value={mode}>
      <ThreadListChips phone={PHONE} lists={lists} listSearch={{ page: 3, q: 'أم' }} />
    </InboxModeContext.Provider>,
  );
}

describe('ThreadListChips: the open chat\'s lists in its header', () => {
  it('links each list to the chip row, keeping the chat open (sales and admin)', () => {
    show('sales');
    const chip = screen.getByRole('link', { name: PAY.name });
    const href = chip.getAttribute('href') ?? '';
    expect(href.startsWith('/sales/inbox?')).toBe(true);
    expect(href).toContain(`list=${PAY.id}`);
    expect(href).toContain('phone=%2B966501234567');
    expect(href).toContain('page=1');
    expect(screen.getByRole('group', { name: t.inbox.lists.chatLists })).toBeTruthy();
  });

  it('shows nothing for a chat in no list, nor in teacher mode', () => {
    show('admin', []);
    show('teacher');
    expect(screen.queryByRole('link')).toBeNull();
  });
});
