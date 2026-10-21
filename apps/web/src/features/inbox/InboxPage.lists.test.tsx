import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { InboxPage } from './InboxPage';
import { thread } from './inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import type { InboxSearch } from './search';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } } }));

const L = t.inbox.lists;
const PAY = '0c000000-0000-4000-8000-000000000001';
const LISTS = [
  { id: PAY, name: 'بانتظار الدفع', count: 1 },
  { id: '0c000000-0000-4000-8000-000000000002', name: 'تجريبي', count: 0 },
];

function show(input: { search: InboxSearch; mode?: InboxMode; permissions?: string[]; items?: unknown[] }) {
  const mode = input.mode ?? 'sales';
  const items = input.items ?? [thread()];
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role: mode, permissions: input.permissions ?? ['inbox.read', 'inbox.lists'] }],
    ['/chat-lists', LISTS],
    ['/threads?', { items, total: items.length, page: 1, pageSize: 30 }],
  ]);
  const onSearch = vi.fn();
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <InboxPage search={input.search} onSearch={onSearch} />
    </InboxModeContext.Provider>,
  );
  return onSearch;
}

const row = () => screen.findByRole('list', { name: L.rowLabel });
const threadCalls = () => apiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.startsWith('/threads?'));

afterEach(() => apiFetch.mockReset());

describe('InboxPage «القوائم» chip row (docs/22 §4)', () => {
  it('shows «الكل» pressed, every list with its count, then «قائمة جديدة»; a chip filters by its id', async () => {
    const onSearch = show({ search: { page: 2, q: 'أم' } });
    const chips = within(await row());
    expect(chips.getByRole('button', { name: L.all }).getAttribute('aria-pressed')).toBe('true');
    expect(chips.getByRole('button', { name: /بانتظار الدفع/ }).getAttribute('aria-pressed')).toBe('false');
    expect(chips.getAllByRole('button').at(-1)?.textContent).toBe(L.new);
    fireEvent.click(chips.getByRole('button', { name: /بانتظار الدفع/ }));
    expect(onSearch).toHaveBeenCalledWith({ q: 'أم', list: PAY, page: 1 });
  });

  it('asks the API for the URL\'s list, with the other filters; an empty unread page is not «an empty list»', async () => {
    show({ search: { page: 1, list: PAY, unread: true }, items: [] });
    expect(await screen.findByText(t.inbox.emptyUnread)).toBeTruthy();
    expect(screen.queryByText(L.empty)).toBeNull();
    expect(within(await row()).getByRole('button', { name: /بانتظار الدفع/ }).getAttribute('aria-pressed')).toBe('true');
    expect(threadCalls().at(-1)).toContain(`list=${PAY}`);
    expect(threadCalls().at(-1)).toContain('unread=true');
    expect(screen.getByRole('button', { name: L.editNamed.replace('{name}', 'بانتظار الدفع') })).toBeTruthy();
  });

  it('an unknown list id falls back to «الكل» (no list in the request once the lists are known)', async () => {
    show({ search: { page: 1, list: '0c000000-0000-4000-8000-0000000000ff' } });
    const chips = within(await row());
    expect(chips.getByRole('button', { name: L.all }).getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(threadCalls().at(-1)).not.toContain('list='));
    expect(screen.queryByRole('button', { name: /تعديل/ })).toBeNull();
  });

  it('lists that fail to load: one quiet line, and the chats are not filtered by a list nobody can see', async () => {
    routeFetch(apiFetch, [
      ['/auth/me', { id: 'u1', email: null, role: 'sales', permissions: ['inbox.read', 'inbox.lists'] }],
      ['/threads?', { items: [thread()], total: 1, page: 1, pageSize: 30 }],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <InboxPage search={{ page: 1, list: PAY }} onSearch={vi.fn()} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByText(L.loadError)).toBeTruthy();
    await waitFor(() => expect(threadCalls().at(-1)).not.toContain('list='));
  });

  it('scrolls sideways inside itself, never widening the page (#120)', async () => {
    show({ search: { page: 1 } });
    const ul = await row();
    expect(ul.className).toContain('overflow-x-auto');
    expect(ul.className).toContain('min-w-0');
    expect(ul.parentElement?.className).toContain('min-w-0');
  });

  it('is absent in teacher mode and without inbox.lists (the lists are never asked for)', async () => {
    show({ search: { page: 1, list: PAY }, mode: 'teacher', permissions: ['inbox.read', 'inbox.lists'] });
    await screen.findAllByRole('link');
    expect(screen.queryByRole('list', { name: L.rowLabel })).toBeNull();
    expect(threadCalls().every((p) => !p.includes('list='))).toBe(true);
    apiFetch.mockReset();
    show({ search: { page: 1 }, permissions: ['inbox.read'] });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/auth/me'));
    await screen.findAllByRole('link');
    expect(screen.queryByRole('list', { name: L.rowLabel })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalledWith('/chat-lists');
  });
});
