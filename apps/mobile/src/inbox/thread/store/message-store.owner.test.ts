import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, plan, row, threadRow } from './store-fixtures';

// One account's rows never reach another (docs/43 43-6, §6 «wipe on sign-out and role change»).

async function filledFor(owner: string) {
  const { port } = memoryPort();
  const store = createMessageStore(port);
  await store.open(owner);
  const state = { cursor: 'c', more: false, scope: 'admin:1' };
  await store.apply(plan([row({ n: 1 })], { threads: [threadRow(A, 1)], state }), owner);
  return { store, port };
}

const empty = { chats: [], threads: [], state: { cursor: null, more: false, scope: null } };
const contents = async (store: ReturnType<typeof createMessageStore>) => ({
  chats: await store.chat(A, 10),
  threads: await store.threads(),
  state: await store.state(),
});

test('opened by another user, the store is wiped before any read (and listeners hear it)', async () => {
  const { port } = await filledFor('user-a');
  const next = createMessageStore(port);
  const heard: unknown[] = [];
  next.subscribe((c) => heard.push(c));
  await next.open('user-b');
  expect(await contents(next)).toEqual(empty);
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
  expect(await store.apply(plan([row({ n: 2 })]), 'user-a')).toBe(false);
  const next = createMessageStore(port);
  await next.open('user-b');
  expect(await contents(next)).toEqual(empty);
});

test('a write planned for the old account after a switch is dropped', async () => {
  const { store } = await filledFor('user-a');
  const late = store.apply(plan([row({ n: 5 })]), 'user-a');
  const reads = store.putReads([row({ n: 6 })], 'user-a');
  await store.wipe();
  await store.open('user-b');
  // Both were queued before the wipe: they ran under user-a and were wiped with the rest.
  await Promise.all([late, reads]);
  expect(await store.apply(plan([row({ n: 7 })]), 'user-a')).toBe(false);
  expect(await store.putReads([row({ n: 8 })], 'user-a')).toBe(false);
  expect(await contents(store)).toEqual(empty);
});
