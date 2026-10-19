import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { message } from './inbox-fixture';
import { MessageLog } from './MessageLog';

// A reminder carrying a 275-character form link made the whole log scroll sideways (owner 2026-10-19):
// `break-words` does not shrink a grid track's min-content, so one long token widened every row.
// jsdom has no layout, so this pins the three classes that keep the log inside the chat.
const LINK = `https://docs.google.com/forms/d/${'x'.repeat(240)}/viewform`;
const base = { hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };

describe('MessageLog: a long unbroken link wraps inside its bubble', () => {
  it('the column is minmax(0,1fr), the bubble may shrink, and the text breaks anywhere', () => {
    render(<MessageLog {...base} messages={[message({ id: 'l', body: `رابط التقييم: ${LINK}` })]} />);
    const list = screen.getByRole('log', { name: t.messages.log }).querySelector('ol');
    expect(list?.className).toContain('grid-cols-[minmax(0,1fr)]');
    const body = screen.getByText(/رابط التقييم/);
    expect(body.className).toContain('[overflow-wrap:anywhere]');
    expect(body.closest('article')?.className).toContain('min-w-0');
  });
});
