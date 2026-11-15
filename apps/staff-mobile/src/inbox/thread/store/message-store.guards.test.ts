import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, applyAs, at, id, plan, row, threadRow } from './store-fixtures';

// The review of #674: stale plans, tombstoned rows and chats-list rows, time order.

async function opened() {
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  return store;
}

const ids = async (store: ReturnType<typeof createMessageStore>) =>
  (await store.chat('user-a', A, 10)).map((m) => m.id);

test('a plan made from a mark the store no longer holds is dropped (compare-and-set)', async () => {
  const store = await opened();
  const base = await store.state();
  const moved = { cursor: 'c2', more: false, scope: 'admin:1' };
  await applyAs(store, plan([row({ n: 1 })], { state: moved }));
  const stale = plan([row({ n: 2 })], { state: { ...moved, cursor: 'c1' } });
  expect(await store.apply(stale, { owner: 'user-a', base })).toBe(false);
  expect([await ids(store), (await store.state()).cursor]).toEqual([[id(1)], 'c2']);
});

test('a tombstoned last message takes its chats-list row with it', async () => {
  const store = await opened();
  await applyAs(store, plan([row({ n: 1 }), row({ n: 2 })], { threads: [threadRow(A, 2)] }));
  await applyAs(store, plan([], { remove: [id(2)] }));
  expect([await ids(store), await store.threads('user-a')]).toEqual([[id(1)], []]);
});

test('a chat read in flight never brings a tombstoned row back', async () => {
  const store = await opened();
  await applyAs(store, plan([row({ n: 1 }), row({ n: 2 })]));
  await applyAs(store, plan([], { remove: [id(1)] }));
  await store.putReads([row({ n: 1 }), row({ n: 3 })], 'user-a');
  expect(await ids(store)).toEqual([id(3), id(2)]);
});

test('time order is by instant, whatever the text: «Z» and «+00:00» mix', async () => {
  const store = await opened();
  const z = { ...row({ n: 1 }), created_at: '2026-11-06T10:00:05.5Z' };
  const pg = { ...row({ n: 2 }), created_at: at(5) }; // 10:00:05.000001+00:00, earlier
  await applyAs(store, plan([z, pg]));
  expect(await ids(store)).toEqual([id(1), id(2)]);
});
