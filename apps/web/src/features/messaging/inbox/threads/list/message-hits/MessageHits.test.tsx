import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ChatAnchorContext } from '@/features/messaging/inbox/shared/chat-anchor';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ThreadList } from '@/features/messaging/inbox/threads/list/ThreadList';
import { emptyTitle } from '@/features/messaging/inbox/threads/list/empty-title';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const W = t.inbox.messageSearch;
const ID = 'd0000000-0000-4000-8000-000000000001';
const HIT = {
  id: ID,
  created_at: '2026-10-01T09:30:00.123456+00:00',
  snippet: 'موعد درس الإسلام اليوم',
  phone_e164: '+966500000007',
  display_name: 'ولي أمر تجريبي',
};

function show(q: string, opts: { threads?: ReturnType<typeof thread>[]; msg?: string } = {}) {
  const open = vi.fn();
  renderWithClient(
    <ChatAnchorContext value={{ msg: undefined, anchor: vi.fn(), open }}>
      <ThreadList
        search={{ page: 1, q, msg: opts.msg }}
        threads={opts.threads ?? []}
        onFilter={vi.fn()}
      />
    </ChatAnchorContext>,
  );
  return open;
}

afterEach(() => apiFetch.mockReset());

describe('«الرسائل» in the chats list (docs/37 NEW 1)', () => {
  it('1–2 characters: the hint, no section and no request', () => {
    show('اَبْ');
    expect(screen.getByText(W.hint)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: W.section })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('from 3 characters: the hits with the match marked, «عرض مزيد من الرسائل» while a cursor remains', async () => {
    apiFetch.mockResolvedValue({ items: [HIT], next_cursor: 'c_1' });
    show('اسلام');
    expect(await screen.findByText(HIT.display_name)).toBeTruthy();
    expect(screen.getByRole('heading', { name: W.section })).toBeTruthy();
    expect(screen.queryByText(emptyTitle({ page: 1, q: 'اسلام' }))).toBeNull();
    expect(document.querySelector('mark')?.textContent).toBe('إسلام');
    expect(apiFetch).toHaveBeenCalledWith(`/threads/search?q=${encodeURIComponent('اسلام')}`);
    fireEvent.click(screen.getByRole('button', { name: W.more }));
    expect(apiFetch).toHaveBeenLastCalledWith(`/threads/search?q=${encodeURIComponent('اسلام')}&cursor=c_1`);
  });

  it('a tap opens that chat at that message; the open hit is marked current', async () => {
    apiFetch.mockResolvedValue({ items: [HIT], next_cursor: null });
    const open = show('اسلام', { msg: ID });
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(HIT.display_name) }));
    expect(open).toHaveBeenCalledWith({ phone: HIT.phone_e164, msg: ID });
    expect(screen.getByRole('button', { name: new RegExp(HIT.display_name) }).getAttribute('aria-current')).toBe('true');
    expect(screen.queryByRole('button', { name: W.more })).toBeNull();
  });

  it('no chat but message hits: no «no chats» empty state; with chats, «المحادثات» labels them', async () => {
    apiFetch.mockResolvedValue({ items: [HIT], next_cursor: null });
    show('اسلام', { threads: [thread()] });
    expect(await screen.findByText(W.chats)).toBeTruthy();
  });

  it('nothing found says so', async () => {
    apiFetch.mockResolvedValue({ items: [], next_cursor: null });
    show('وداعا');
    expect(await screen.findByText(W.empty)).toBeTruthy();
  });

  it('a failed search says so', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    show('وداعا');
    expect(await screen.findByText(W.failed)).toBeTruthy();
  });
});
