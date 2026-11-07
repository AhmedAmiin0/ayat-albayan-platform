import type { LiveRow } from '@ab/client-core';
import type { MessageStatus } from '@ab/shared';
import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, B, applyAs, at, id, plan, row, threadRow } from './store-fixtures';

// docs/44 K1: a realtime event's ticks straight into the phone store (no HTTP); the same owner
// guard as every write; the server's sync stamp untouched.

const live = (n: number, s: MessageStatus): LiveRow => ({ id: id(n), s, d: 'outbound', at: '' });
/** Row 1 as a later sync answers it: a newer updated_at, the same created_at. */
const synced = (status: MessageStatus, s: number) => ({
  ...row({ n: 1, status }),
  updated_at: at(s),
});

async function filled() {
  const { port } = memoryPort();
  const store = createMessageStore(port);
  await store.open('user-a');
  const rows = [
    row({ n: 1, status: 'queued' }),
    row({ n: 2, status: 'read' }),
    row({ n: 3, phone: B }),
  ];
  await applyAs(store, plan(rows, { threads: [{ ...threadRow(A, 2), last_status: 'read' }] }));
  const heard: unknown[] = [];
  store.subscribe((c) => heard.push(c));
  const statuses = async () => (await store.chat('user-a', A, 10)).map((m) => m.status);
  return { store, port, heard, statuses };
}

test('held rows move forward; the chats-list row of the last message too; listeners hear it', async () => {
  const { store, heard, statuses } = await filled();
  const at = { owner: 'user-a', phone: A };
  await store.live([live(2, 'delivered')], at); // ✓✓ read never goes back
  expect(await store.live([live(1, 'sent')], at)).toBe(true);
  expect(await statuses()).toEqual(['read', 'sent']);
  expect(heard).toEqual([new Set([A])]);
  await applyAs(store, plan([], { threads: [threadRow(A, 1)] }));
  await store.live([live(1, 'delivered')], at);
  expect((await store.threads('user-a'))[0]?.last_status).toBe('delivered');
});

test('the sync stamp stays: the next sync still lands the server row', async () => {
  const { store } = await filled();
  await store.live([live(1, 'sent')], { owner: 'user-a', phone: A });
  const held = await store.held([id(1)]);
  expect(held(id(1))).toBe(row({ n: 1 }).updated_at);
});

test('an unknown id, or a row of another chat, is not complete (the caller re-reads)', async () => {
  const { store, statuses } = await filled();
  const at = { owner: 'user-a', phone: A };
  expect(await store.live([live(1, 'sent'), live(9, 'queued')], at)).toBe(false);
  expect(await statuses()).toEqual(['read', 'sent']);
  expect(await store.live([live(3, 'read')], at)).toBe(false);
  expect((await store.chat('user-a', B, 10))[0]?.status).toBe('sent');
});

test('another owner writes nothing and gets false', async () => {
  const { store, heard, statuses } = await filled();
  expect(await store.live([live(1, 'read')], { owner: 'user-b', phone: A })).toBe(false);
  expect(await statuses()).toEqual(['read', 'queued']);
  expect(heard).toEqual([]);
});

test('failed replaces any tick (laterStatus)', async () => {
  const { store, statuses } = await filled();
  expect(await store.live([live(2, 'failed')], { owner: 'user-a', phone: A })).toBe(true);
  expect(await statuses()).toEqual(['failed', 'queued']);
});

test('a sync read in flight lands after a live tick: the tick never goes back', async () => {
  const { store, statuses } = await filled();
  await applyAs(store, plan([], { threads: [threadRow(A, 1)] }));
  await store.live([live(1, 'delivered')], { owner: 'user-a', phone: A });
  const older = synced('sent', 30); // newer updated_at, older tick
  await applyAs(store, plan([older], { threads: [{ ...threadRow(A, 1), last_status: 'sent' }] }));
  expect(await statuses()).toEqual(['read', 'delivered']);
  expect((await store.threads('user-a'))[0]?.last_status).toBe('delivered');
  expect((await store.held([id(1)]))(id(1))).toBe(older.updated_at);
});

test('a sync bringing failed (or a retry back to queued) still lands over a live tick', async () => {
  const { store, statuses } = await filled();
  await store.live([live(1, 'delivered')], { owner: 'user-a', phone: A });
  await applyAs(store, plan([synced('failed', 30)]));
  expect(await statuses()).toEqual(['read', 'failed']);
  await applyAs(store, plan([synced('queued', 40)]));
  expect(await statuses()).toEqual(['read', 'queued']);
});
