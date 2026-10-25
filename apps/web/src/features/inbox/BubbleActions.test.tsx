import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from './ChatActionsProvider';
import { message, PHONE, thread } from './testing/inbox-fixture';
import { MessageLog } from './MessageLog';
import { renderWithClient } from './testing/test-utils';

const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };
const M = message({ id: 'm1', body: 'السلام عليكم', replyable: true, forwardable: true });

function renderLog(opts: { enabled: boolean; m?: typeof M }) {
  renderWithClient(
    <ChatActionsProvider thread={thread()} enabled={opts.enabled}>
      <MessageLog {...base} messages={[opts.m ?? M]} />
    </ChatActionsProvider>,
  );
}

const menuButton = () => screen.getByRole('button', { name: t.inbox.reply.menu });
const article = () => {
  const el = document.querySelector('#msg-m1 article');
  if (!el) throw new Error('no bubble');
  return el;
};

describe('the bubble’s «رد» / «إعادة توجيه»', () => {
  it('a right-click opens the menu with both; Esc closes it and the focus goes back to ⋯', () => {
    renderLog({ enabled: true });
    fireEvent.contextMenu(article());
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    const reply = screen.getAllByRole('button', { name: t.inbox.reply.action });
    expect(reply).toHaveLength(2); // the hover button and the menu's
    expect(screen.getByRole('button', { name: t.inbox.forward.action })).toBeTruthy();
    expect(document.activeElement).toBe(reply[1]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: t.inbox.forward.action })).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it('a template is not forwardable: the menu has «رد» only', () => {
    renderLog({ enabled: true, m: { ...M, template_key: 'renewal_due' } });
    fireEvent.click(menuButton());
    expect(screen.queryByRole('button', { name: t.inbox.forward.action })).toBeNull();
  });

  it('outside a writable chat (teacher mode, read-only): no actions and the browser’s own menu', () => {
    renderLog({ enabled: false });
    expect(screen.queryByRole('button', { name: t.inbox.reply.menu })).toBeNull();
    expect(fireEvent.contextMenu(article())).toBe(true); // not prevented
  });

  it('a message WhatsApp does not know (no wamid) and not forwardable: nothing', () => {
    renderLog({ enabled: true, m: { ...M, replyable: false, forwardable: false } });
    expect(screen.queryByRole('button', { name: t.inbox.reply.menu })).toBeNull();
  });
});
