import type { ThreadView } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { thread } from '@/inbox/shared/thread-fixtures';
import type { ThreadListCache } from '@/inbox/thread/hooks/thread-list-cache';
import { readListHead } from './list-head';

// The chats list after an event: page 1 only, merged into the cached pages, never every loaded
// page in sequence (that made the list seconds late).

const KEY = ['threads', 'list', { search: '', unread: false }];
const at = (n: number) => new Date(Date.UTC(2026, 10, 28, 10, n)).toISOString();
const chat = (phone: string, n: number): ThreadView => ({
  ...thread,
  phone_e164: phone,
  last_message_id: `m${n}`,
  last_message_at: at(n),
});
const page = (items: ThreadView[], n = 1, total = 60) => ({ items, total, page: n, pageSize: 25 });

function cached() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const older = page([chat('+966500000003', 1)], 2);
  const data = { pages: [page([chat('+966500000001', 3), chat('+966500000002', 2)]), older] };
  client.setQueryData(KEY, { ...data, pageParams: [1, 2] }, { updatedAt: 1 });
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  return { client, older, refetch };
}

const phonesOf = (client: QueryClient) =>
  client
    .getQueryData<ThreadListCache>(KEY)
    ?.pages.map((p) => p.items.map((th) => th.phone_e164));

test('the fresh page 1 replaces the cached one; the older pages stay as they are', async () => {
  const { client, older, refetch } = cached();
  const fresh = page([chat('+966500000002', 9), chat('+966500000001', 3)]);
  await readListHead(client, KEY, () => Promise.resolve(fresh));
  expect(phonesOf(client)).toEqual([['+966500000002', '+966500000001'], ['+966500000003']]);
  expect(client.getQueryData<ThreadListCache>(KEY)?.pages[1]).toBe(older);
  expect(client.getQueryState(KEY)?.dataUpdatedAt).toBeGreaterThan(1);
  expect(refetch).not.toHaveBeenCalled();
});

test('a gap (a full page 1 sharing no row) reads every page again', async () => {
  const { client, refetch } = cached();
  const fresh = page([chat('+966500000008', 9), chat('+966500000009', 8)]);
  await readListHead(client, KEY, () => Promise.resolve(fresh));
  expect(refetch).toHaveBeenCalledWith({ queryKey: KEY, exact: true }, { cancelRefetch: false });
});

test('a failed page-1 read leaves the cache as it is (the polls catch up)', async () => {
  const { client, refetch } = cached();
  await readListHead(client, KEY, () => Promise.reject(new Error('offline')));
  expect(phonesOf(client)).toEqual([['+966500000001', '+966500000002'], ['+966500000003']]);
  expect(client.getQueryState(KEY)?.dataUpdatedAt).toBe(1);
  expect(refetch).not.toHaveBeenCalled();
});

test('a list never loaded runs its own first read instead (nothing to merge into)', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const first = jest.fn(() => Promise.resolve(page([])));
  await readListHead(client, KEY, first);
  expect(first).not.toHaveBeenCalled();
  expect(refetch).toHaveBeenCalledWith({ queryKey: KEY, exact: true }, { cancelRefetch: false });
});
