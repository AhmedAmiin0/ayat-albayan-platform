import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, plan, row, threadRow, applyAs } from './store-fixtures';

// One account's rows never reach another (docs/43 43-6, §6 «wipe on sign-out and role change»).

async function filledFor(owner: string) {
  const { port } = memoryPort();
  const store = createMessageStore(port);
  await store.open(owner);
  const state = { cursor: 'c', more: false, scope: 'admin:1' };
  await applyAs(store, plan([row({ n: 1 })], { threads: [threadRow(A, 1)], state }), owner);
  return { store, port };
}

const empty = { chats: [], threads: [], state: { cursor: null, more: false, scope: null } };
const contents = async (store: ReturnType<typeof createMessageStore>, owner = 'user-a') => ({
  chats: await store.chat(owner, A, 10),
  threads: await store.threads(owner),
  state: await store.state(),
});

test('opened by another user, the store is wiped before any read (and listeners hear it)', async () => {
  const { port } = await filledFor('user-a');
  const next = createMessageStore(port);
  const heard: unknown[] = [];
  next.subscribe((c) => heard.push(c));
  await next.open('user-b');
  expect(await contents(next, 'user-b')).toEqual(empty);
  expect(heard).toEqual(['all']);
});

test('the same user again keeps every row', async () => {
  const { port } = await filledFor('user-a');
  const again = createMessageStore(port);
  await again.open('user-a');
  expect((await contents(again)).chats).toHaveLength(1);
});

test('sign-out wipes everything and the owner: the next user starts empty', async () => {
  const { store, port } = await filledFor('user-a');
  await store.wipe();
  expect(await contents(store)).toEqual(empty);
  expect(await applyAs(store, plan([row({ n: 2 })]), 'user-a')).toBe(false);
  const next = createMessageStore(port);
  await next.open('user-b');
  expect(await contents(next, 'user-b')).toEqual(empty);
});

test('before any open, another user reads nothing of the rows on disk', async () => {
  const { port } = await filledFor('user-a');
  const next = createMessageStore(port);
  expect([await next.chat('user-b', A, 10), await next.threads('user-b')]).toEqual([[], []]);
  expect((await next.chat('user-a', A, 10)).length).toBe(1);
});

test('a write planned for the old account after a switch is dropped', async () => {
  const { store } = await filledFor('user-a');
  const late = applyAs(store, plan([row({ n: 5 })]), 'user-a');
  const reads = store.putReads([row({ n: 6 })], 'user-a');
  await store.wipe();
  await store.open('user-b');
  // Both were queued before the wipe: they ran under user-a and were wiped with the rest.
  await Promise.all([late, reads]);
  expect(await applyAs(store, plan([row({ n: 7 })]), 'user-a')).toBe(false);
  expect(await store.putReads([row({ n: 8 })], 'user-a')).toBe(false);
  expect(await contents(store, 'user-b')).toEqual(empty);
});
