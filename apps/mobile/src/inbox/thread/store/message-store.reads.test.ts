import { UNSYNCED_AT } from '@ab/client-core';
import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, plan, row, applyAs } from './store-fixtures';

// A chat read or a send's answer merged into the store by id (mergeRead, the 43-1 rank).

async function opened() {
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  return store;
}

test('a row never synced is stored with the unsynced stamp; listeners hear its chat', async () => {
  const store = await opened();
  const heard: unknown[] = [];
  store.subscribe((c) => heard.push(c === 'all' ? c : [...c]));
  const { updated_at: _, ...view } = row({ n: 1 });
  expect(await store.putReads([view], 'user-a')).toBe(true);
  expect(await store.chat('user-a', A, 1)).toEqual([{ ...view, updated_at: UNSYNCED_AT }]);
  expect(heard).toEqual([[A]]);
});

test('an older read never takes ✓✓ back to ✓, and keeps the sync stamp', async () => {
  const store = await opened();
  const synced = row({ n: 1, s: 9, status: 'read' });
  await applyAs(store, plan([synced]), 'user-a');
  await store.putReads([{ ...row({ n: 1 }), status: 'delivered', body: 'edited' }], 'user-a');
  const [kept] = await store.chat('user-a', A, 1);
  expect([kept?.status, kept?.body, kept?.updated_at]).toEqual(['read', 'edited', synced.updated_at]);
});

test('failed comes through over a ranked tick (the server moved it on purpose)', async () => {
  const store = await opened();
  await applyAs(store, plan([row({ n: 1, status: 'delivered' })]), 'user-a');
  await store.putReads([{ ...row({ n: 1 }), status: 'failed' }], 'user-a');
  expect((await store.chat('user-a', A, 1))[0]?.status).toBe('failed');
});
