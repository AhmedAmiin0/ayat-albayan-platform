import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from '@/inbox/thread/store/message-store';
import { A, applyAs, B, id, plan, row, threadRow } from '@/inbox/thread/store/store-fixtures';
import { createStoreReader } from './store-reader';

// What the screens read from the phone store (docs/43 43-7): snapshots that follow its writes.

async function setup() {
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  const reader = createStoreReader();
  const heard = jest.fn();
  reader.subscribe(heard);
  return { store, reader, heard };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const ids = (rows: readonly { id: string }[]) => rows.map((m) => m.id);

test('attached: the chats-list rows by phone; a watched chat its newest rows', async () => {
  const t = await setup();
  await applyAs(t.store, plan([row({ n: 1 }), row({ n: 2 })], { threads: [threadRow(A, 2)] }));
  t.reader.attach(t.store, 'user-a');
  const release = t.reader.watchChat(A);
  await settle();
  expect(t.reader.threads().get(A)?.last_message_id).toBe(id(2));
  expect(ids(t.reader.chat(A))).toEqual([id(2), id(1)]);
  expect(t.reader.chat(B)).toEqual([]);
  release();
  expect(t.reader.chat(A)).toEqual([]);
});

test('a write re-reads the touched watched chat and tells the screens; snapshots are new', async () => {
  const t = await setup();
  t.reader.attach(t.store, 'user-a');
  t.reader.watchChat(A);
  await settle();
  const before = t.reader.chat(A);
  t.heard.mockClear();
  await applyAs(t.store, plan([row({ n: 3 })]));
  await settle();
  expect(ids(t.reader.chat(A))).toEqual([id(3)]);
  expect(t.reader.chat(A)).not.toBe(before);
  expect(t.heard).toHaveBeenCalled();
});

test('two watchers of one chat: it stays until the last one leaves', async () => {
  const t = await setup();
  await applyAs(t.store, plan([row({ n: 1 })]));
  t.reader.attach(t.store, 'user-a');
  const first = t.reader.watchChat(A);
  const second = t.reader.watchChat(A);
  await settle();
  first();
  expect(ids(t.reader.chat(A))).toEqual([id(1)]);
  second();
  expect(t.reader.chat(A)).toEqual([]);
});

test('detached (sign-out): empty at once, and a read still out never lands', async () => {
  const t = await setup();
  await applyAs(t.store, plan([row({ n: 1 })], { threads: [threadRow(A, 1)] }));
  t.reader.attach(t.store, 'user-a');
  t.reader.watchChat(A);
  t.reader.detach();
  await settle();
  expect([t.reader.chat(A), t.reader.threads().size]).toEqual([[], 0]);
});

test('attached for another owner: that owner reads nothing of the rows', async () => {
  const t = await setup();
  await applyAs(t.store, plan([row({ n: 1 })], { threads: [threadRow(A, 1)] }));
  t.reader.attach(t.store, 'user-b');
  t.reader.watchChat(A);
  await settle();
  expect([t.reader.chat(A), t.reader.threads().size]).toEqual([[], 0]);
});
