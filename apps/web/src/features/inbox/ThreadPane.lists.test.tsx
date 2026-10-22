import type { Permission } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meQuery, type Me } from '@/features/auth/me';
import { t } from '@/lib/i18n';
import { detail, message, PHONE } from './inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import { routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const L = t.inbox.lists;
const PAY = { id: '0c000000-0000-4000-8000-000000000001', name: 'بانتظار الدفع' };
const ALL: Permission[] = ['inbox.read', 'inbox.send', 'messages.read', 'inbox.lists'];

function open(mode: InboxMode, permissions = ALL) {
  // Teachers never get `lists` from the API; the others carry the chat's.
  const lists = mode === 'teacher' ? undefined : [PAY];
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', { ...detail([message({ body: 'السلام عليكم' })]), lists }],
    ['/chat-lists', [{ ...PAY, count: 1 }]],
    ['/messaging/templates', []],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', {}],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/sales/money/family', { students: [] }],
    ['/teachers/me', { id: 't-1' }],
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const me: Me = { id: 'u-1', email: null, role: mode === 'teacher' ? 'teacher' : mode === 'admin' ? 'admin' : 'sales', permissions };
  client.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={client}>
      <InboxModeContext.Provider value={mode}>
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>
    </QueryClientProvider>,
  );
}

const item = () => screen.queryByRole('button', { name: L.title, hidden: true });

describe('the open chat\'s «القوائم» (docs/22 §4)', () => {
  afterEach(() => apiFetch.mockReset());

  it.each(['admin', 'sales'] as const)('%s: the header shows the chat\'s lists and «المزيد» has «القوائم»', async (mode) => {
    open(mode);
    await screen.findByText('السلام عليكم');
    expect(screen.getByRole('link', { name: PAY.name }).getAttribute('href')).toContain(`list=${PAY.id}`);
    fireEvent.click(screen.getByRole('button', { name: t.common.more }));
    fireEvent.click(screen.getByRole('button', { name: L.title }));
    expect(await screen.findByRole('dialog', { name: L.title })).toBeTruthy();
    expect((await screen.findByRole<HTMLInputElement>('checkbox', { name: PAY.name })).checked).toBe(true);
  });

  it('without inbox.lists: no «القوائم» entry', async () => {
    open('sales', ['inbox.read', 'inbox.send', 'messages.read']);
    await screen.findByText('السلام عليكم');
    expect(item()).toBeNull();
  });

  it('teacher mode: no lists, no entry, the chat unchanged', async () => {
    open('teacher', ALL);
    await screen.findByText('السلام عليكم');
    expect(item()).toBeNull();
    expect(screen.queryByRole('group', { name: L.chatLists })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalledWith('/chat-lists');
  });
});
