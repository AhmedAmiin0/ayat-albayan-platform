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

test('a synced row keeps its fields and stamp over an older read; ✓✓ never goes back', async () => {
  const store = await opened();
  const synced = { ...row({ n: 1, s: 9, status: 'read' }), body: 'synced' };
  await applyAs(store, plan([synced]), 'user-a');
  await store.putReads([{ ...row({ n: 1 }), status: 'delivered', body: 'old read' }], 'user-a');
  expect(await store.chat('user-a', A, 1)).toEqual([synced]);
});

test('a read lifts a synced tick further along (the next sync decides the rest)', async () => {
  const store = await opened();
  await applyAs(store, plan([row({ n: 1, status: 'sent' })]), 'user-a');
  await store.putReads([{ ...row({ n: 1 }), status: 'read' }], 'user-a');
  expect((await store.chat('user-a', A, 1))[0]?.status).toBe('read');
});

test('failed comes through over a ranked tick held only from reads', async () => {
  const store = await opened();
  const { updated_at: _, ...view } = row({ n: 1, status: 'delivered' });
  await store.putReads([view], 'user-a');
  await store.putReads([{ ...view, status: 'failed' }], 'user-a');
  expect((await store.chat('user-a', A, 1))[0]?.status).toBe('failed');
});

test('a read equal to the stored row writes nothing and tells no reader', async () => {
  const store = await opened();
  const { updated_at: _, ...view } = row({ n: 1 });
  await store.putReads([view], 'user-a');
  const heard = jest.fn();
  store.subscribe(heard);
  expect(await store.putReads([view], 'user-a')).toBe(true);
  expect(heard).not.toHaveBeenCalled();
});
