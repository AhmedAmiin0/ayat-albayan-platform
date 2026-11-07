import type { LiveRow } from '@ab/client-core';
import type { MessageStatus } from '@ab/shared';
import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, at as at0, B, applyAs, id, plan, row, threadRow } from './store-fixtures';

// docs/44 K1: a realtime event's ticks straight into the phone store (a visual patch); the same
// owner guard as every write; the server's sync stamp untouched. Syncs around a patch:
// sync-engine.live.test.ts.

const live = (n: number, s: MessageStatus): LiveRow => ({ id: id(n), s, d: 'outbound', at: '' });

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

test('an unknown id, or a row of another chat, moves nothing', async () => {
  const { store, statuses } = await filled();
  const at = { owner: 'user-a', phone: A };
  expect(await store.live([live(1, 'sent'), live(9, 'queued')], at)).toBe(true);
  expect(await statuses()).toEqual(['read', 'sent']);
  await store.live([live(3, 'read')], at);
  expect((await store.chat('user-a', B, 10))[0]?.status).toBe('sent');
});

test('another owner writes nothing and gets false', async () => {
  const { store, heard, statuses } = await filled();
  expect(await store.live([live(1, 'read')], { owner: 'user-b', phone: A })).toBe(false);
  expect(await statuses()).toEqual(['read', 'queued']);
  expect(heard).toEqual([]);
});

test('a failed event lands only when newer than the stored row (liveTick)', async () => {
  const { store, statuses } = await filled();
  const at = { owner: 'user-a', phone: A };
  await store.live([{ ...live(2, 'failed'), at: at0(0) }], at);
  expect(await statuses()).toEqual(['read', 'queued']);
  await store.live([{ ...live(2, 'failed'), at: at0(9) }], at);
  expect(await statuses()).toEqual(['failed', 'queued']);
});

test('a synced failure is never undone by a late tick; a sent row still moves forward', async () => {
  const { store, statuses } = await filled();
  await applyAs(store, plan([row({ n: 1, s: 5, status: 'failed' })]));
  const at = { owner: 'user-a', phone: A };
  await store.live([live(1, 'sent')], at);
  expect(await statuses()).toEqual(['failed', 'read']);
  await applyAs(store, plan([row({ n: 1, s: 6, status: 'sent' })]));
  await store.live([live(1, 'delivered')], at);
  expect(await statuses()).toEqual(['delivered', 'read']);
});
