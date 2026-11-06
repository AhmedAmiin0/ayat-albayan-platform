import type { MessageStatus } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detail, message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { threadsQuery } from './api';
import { threadQuery } from './thread-query';
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

describe('useThreads: the inbox list never shows a tick behind its chat', () => {
  it('a list answer still saying pending shows the ✓✓ the chat already merged', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(threadQuery(PHONE).queryKey, chat('delivered'));
    apiFetch.mockResolvedValue(page('queued'));
    const { result } = renderHook(() => useThreads({ page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.last_status).toBe('delivered'));
  });

  it('a list answer further along, or failed, wins', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(threadQuery(PHONE).queryKey, chat('sent'));
    apiFetch.mockResolvedValue(page('failed'));
    const { result } = renderHook(() => useThreads({ page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.last_status).toBe('failed'));
  });
});

describe('useTicksInLists: the open chat writes its ticks into every cached list', () => {
  it('lifts the row at once, keeping the list\'s time and its stale mark', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(LIST, page('queued'), { updatedAt: 1000 });
    await client.invalidateQueries({ queryKey: LIST, refetchType: 'none' });
    const { rerender } = renderHook(({ data }) => useTicksInLists(data), {
      wrapper,
      initialProps: { data: chat('queued') },
    });
    expect(listed(client)).toBe('queued');
    rerender({ data: chat('read') });
    expect(listed(client)).toBe('read');
    expect(client.getQueryState(LIST)?.dataUpdatedAt).toBe(1000);
    expect(client.getQueryState(LIST)?.isInvalidated).toBe(true);
  });

  it('never lowers a row and leaves an unchanged list untouched', () => {
    const { client, wrapper } = setup();
    const kept = page('read');
    client.setQueryData(LIST, kept);
    renderHook(() => useTicksInLists(chat('sent')), { wrapper });
    renderHook(() => useTicksInLists(undefined), { wrapper });
    expect(client.getQueryData(LIST)).toBe(kept);
  });
});
