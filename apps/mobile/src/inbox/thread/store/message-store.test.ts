import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, B, id, plan, row, threadRow } from './store-fixtures';

// The phone's inbox store on a real SQLite (docs/43 43-6): rows by id, chats-list rows, the mark.

async function opened(owner = 'user-a') {
  const { port, db } = memoryPort();
  const store = createMessageStore(port);
  await store.open(owner);
  return { store, port, db };
}

test('a plan writes rows, chats-list rows and the mark; a chat reads newest first', async () => {
  const { store } = await opened();
  const state = { cursor: 'c', more: true, scope: 'admin:1' };
  const rows = [row({ n: 1 }), row({ n: 3 }), row({ n: 2, phone: B })];
  expect(await store.apply(plan(rows, { threads: [threadRow(A, 3)], state }), 'user-a')).toBe(true);
  expect((await store.chat(A, 10)).map((m) => m.id)).toEqual([id(3), id(1)]);
  expect((await store.chat(A, 1)).map((m) => m.id)).toEqual([id(3)]);
  expect(await store.threads()).toEqual([threadRow(A, 3)]);
  expect(await store.state()).toEqual(state);
  const held = await store.held([id(1), id(9)]);
  expect([held(id(1)), held(id(9))]).toEqual([row({ n: 1 }).updated_at, undefined]);
});

test('a row keeps every field of its view (round trip through the JSON column)', async () => {
  const { store } = await opened();
  const full = { ...row({ n: 1 }), body: 'نص', reply_to: null };
  await store.apply(plan([full]), 'user-a');
  expect(await store.chat(A, 1)).toEqual([full]);
});

test('the same id twice is one row, the later copy (upsert by id)', async () => {
  const { store } = await opened();
  await store.apply(plan([row({ n: 1, status: 'sent' })]), 'user-a');
  await store.apply(plan([row({ n: 1, s: 5, status: 'read' })]), 'user-a');
  expect((await store.chat(A, 10)).map((m) => m.status)).toEqual(['read']);
});

test('tombstones delete rows; a reset empties the store first', async () => {
  const { store } = await opened();
  await store.apply(plan([row({ n: 1 }), row({ n: 2 })], { threads: [threadRow(A, 2)] }), 'user-a');
  await store.apply(plan([], { remove: [id(1), id(7)] }), 'user-a');
  expect((await store.chat(A, 10)).map((m) => m.id)).toEqual([id(2)]);
  await store.apply(plan([row({ n: 4, phone: B })], { reset: true }), 'user-a');
  expect([await store.chat(A, 10), await store.threads()]).toEqual([[], []]);
  expect((await store.chat(B, 10)).map((m) => m.id)).toEqual([id(4)]);
});

test('listeners hear the chats a write touched, removed rows included; a reset is all', async () => {
  const { store } = await opened();
  const heard: unknown[] = [];
  const off = store.subscribe((change) => heard.push(change === 'all' ? 'all' : [...change]));
  await store.apply(plan([row({ n: 1 })]), 'user-a');
  await store.apply(plan([], { remove: [id(1)], threads: [threadRow(B, 2)] }), 'user-a');
  await store.apply(plan([], { reset: true }), 'user-a');
  off();
  await store.apply(plan([row({ n: 2 })]), 'user-a');
  expect(heard).toEqual([[A], [B, A], 'all']);
});

test('a failed write lands nothing (one transaction) and the next write still runs', async () => {
  const { store } = await opened();
  const broken = { ...row({ n: 2 }), created_at: null } as unknown as ReturnType<typeof row>;
  await expect(store.apply(plan([row({ n: 1 }), broken]), 'user-a')).rejects.toThrow();
  expect(await store.chat(A, 10)).toEqual([]);
  await store.apply(plan([row({ n: 3 })]), 'user-a');
  expect((await store.chat(A, 10)).map((m) => m.id)).toEqual([id(3)]);
});
