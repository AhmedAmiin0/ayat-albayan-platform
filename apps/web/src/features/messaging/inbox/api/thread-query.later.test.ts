import type { LiveRow } from '@ab/client-core';
import type { MessageStatus, MessageView, ThreadView } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { threadsQuery } from './api';
import { patchLiveCaches } from './live-patch';
import { threadQuery } from './thread-query';

// docs/44 K1: a read that started before a live tick lands after it: the tick never goes back.

const PHONE = '+966501234567';
const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const live = (s: MessageStatus): LiveRow => ({ id: 'a', s, d: 'outbound', at: '2026-11-07' });
const msg = (status: MessageStatus) => ({ id: 'a', status, body: 'a' }) as MessageView;
const row = (status: MessageStatus) =>
  ({ phone_e164: PHONE, last_message_id: 'a', last_status: status }) as ThreadView;
const chatOf = (client: QueryClient) =>
  client.getQueryData<{ pages: { messages: MessageView[] }[] }>(threadQuery(PHONE).queryKey);
const listOf = (client: QueryClient) =>
  client.getQueryData<{ items: ThreadView[] }>(threadsQuery({ page: 1 }).queryKey);

beforeEach(() => mockApiFetch.mockReset());

it('chat: patched to delivered, an older page (sent) lands → stays delivered', async () => {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValue({ messages: [msg('sent')], has_more: false });
  await client.infiniteQuery(threadQuery(PHONE));
  patchLiveCaches(client, { phone: PHONE, watched: true }, [live('delivered')]);
  await client.refetchQueries({ queryKey: threadQuery(PHONE).queryKey });
  expect(chatOf(client)?.pages[0]?.messages[0]?.status).toBe('delivered');
});

it('chat: failed from the server still replaces a cached tick', async () => {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValue({ messages: [msg('delivered')], has_more: false });
  await client.infiniteQuery(threadQuery(PHONE));
  mockApiFetch.mockResolvedValue({ messages: [msg('failed')], has_more: false });
  await client.refetchQueries({ queryKey: threadQuery(PHONE).queryKey });
  expect(chatOf(client)?.pages[0]?.messages[0]?.status).toBe('failed');
});

it('list: patched to delivered, an older GET /threads (sent) lands → stays delivered', async () => {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValue({ items: [row('sent')], total: 1 });
  await client.query(threadsQuery({ page: 1 }));
  patchLiveCaches(client, { phone: PHONE, watched: true }, [live('delivered')]);
  await client.refetchQueries({ queryKey: threadsQuery({ page: 1 }).queryKey });
  expect(listOf(client)?.items[0]?.last_status).toBe('delivered');
  mockApiFetch.mockResolvedValue({ items: [row('sent_manually')], total: 1 });
  await client.refetchQueries({ queryKey: threadsQuery({ page: 1 }).queryKey });
  expect(listOf(client)?.items[0]?.last_status).toBe('sent_manually');
});
