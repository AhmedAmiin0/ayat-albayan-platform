import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, applyAs, plan, row } from './store-fixtures';

// «تعديل» (owner 2026-11-07): the phone store keeps a row's whole view as json, so a correction's
// link and its sender come back from disk as the API sent them (no column, no user_version bump).
test('corrects_id and sent_by_id round-trip through the store', async () => {
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  const original = { ...row({ n: 1 }), sent_by_id: 'u1', corrects_id: null };
  const correction = { ...row({ n: 2 }), sent_by_id: 'u1', corrects_id: original.id };
  await applyAs(store, plan([original, correction]));
  const [newest, oldest] = await store.chat('user-a', A, 2);
  expect(newest).toMatchObject({ id: correction.id, corrects_id: original.id, sent_by_id: 'u1' });
  expect(oldest).toMatchObject({ id: original.id, corrects_id: null, sent_by_id: 'u1' });
});

test('a read merged into the store keeps them too', async () => {
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  const { updated_at: _, ...view } = { ...row({ n: 3 }), corrects_id: 'o1', sent_by_id: 'u2' };
  await store.putReads([view], 'user-a');
  expect((await store.chat('user-a', A, 1))[0]).toMatchObject({ corrects_id: 'o1', sent_by_id: 'u2' });
});
