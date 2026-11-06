import type { MessageStatus } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detail, message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { threadQuery, threadsQuery } from './api';
import { useThreads, useTicksInLists } from './list-ticks';

// docs/43 §2 (the owner's «pending in the list»), web: a list row follows its chat's tick.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const LIST = threadsQuery({ page: 1 }).queryKey;
const page = (last_status: MessageStatus) => ({
  items: [thread({ last_message_id: 'm2', last_status })],
  total: 1,
  page: 1,
  pageSize: 30,
});
const chat = (status: MessageStatus) => ({
  pages: [detail([message({ id: 'm2', direction: 'outbound', status })])],
  pageParams: [null],
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}
const listed = (client: QueryClient) => client.getQueryData(LIST)?.items[0]?.last_status;

afterEach(() => apiFetch.mockReset());

const CHAT = threadQuery(PHONE).queryKey;
const never = () => new Promise(() => undefined);

describe('useThreads: the inbox list never shows a tick behind a newer chat read', () => {
  it('a list answer still saying pending shows the ✓✓ the chat merged after it', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(LIST, page('queued'), { updatedAt: 1000 });
    client.setQueryData(CHAT, chat('delivered'));
    apiFetch.mockImplementation(never);
    const { result } = renderHook(() => useThreads({ page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.last_status).toBe('delivered'));
  });

  it('a chat copy older than the list never lifts it (a message the server re-queued)', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(CHAT, chat('delivered'), { updatedAt: 500 });
    client.setQueryData(LIST, page('queued'), { updatedAt: 1000 });
    apiFetch.mockImplementation(never);
    const { result } = renderHook(() => useThreads({ page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(result.current.data?.items[0]?.last_status).toBe('queued');
  });

  it('a list answer further along, or failed, wins', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(CHAT, chat('sent'));
    apiFetch.mockResolvedValue(page('failed'));
    const { result } = renderHook(() => useThreads({ page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.last_status).toBe('failed'));
  });
});

describe('useTicksInLists: the open chat writes its ticks into every older cached list', () => {
  const mount = (client: QueryClient, wrapper: ReturnType<typeof setup>['wrapper']) =>
    renderHook(({ data }) => useTicksInLists(PHONE, data), {
      wrapper,
      initialProps: { data: chat('queued') },
    });

  it('lifts the row at once, keeping the list\'s time and its stale mark', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(LIST, page('queued'), { updatedAt: 1000 });
    await client.invalidateQueries({ queryKey: LIST, refetchType: 'none' });
    const { rerender } = mount(client, wrapper);
    expect(listed(client)).toBe('queued');
    client.setQueryData(CHAT, chat('read'));
    rerender({ data: chat('read') });
    expect(listed(client)).toBe('read');
    expect(client.getQueryState(LIST)?.dataUpdatedAt).toBe(1000);
    expect(client.getQueryState(LIST)?.isInvalidated).toBe(true);
  });

  it('never lowers a row, nor writes into a list read after the chat', () => {
    const { client, wrapper } = setup();
    const kept = page('read');
    client.setQueryData(LIST, kept);
    client.setQueryData(CHAT, chat('sent'));
    mount(client, wrapper).rerender({ data: chat('sent') });
    expect(client.getQueryData(LIST)).toBe(kept);
    client.setQueryData(CHAT, chat('delivered'), { updatedAt: 500 });
    client.setQueryData(LIST, page('queued'), { updatedAt: 1000 });
    mount(client, wrapper).rerender({ data: chat('delivered') });
    expect(listed(client)).toBe('queued'); // re-queued by the server after that chat copy
  });
});
