import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, plan, row, applyAs } from './store-fixtures';
import { migrateStore, STORE_VERSION } from './store-schema';

const version = (db: ReturnType<typeof memoryPort>['db']) =>
  db.prepare('pragma user_version').all()[0];

test('a new file gets the tables, one sync_state row and STORE_VERSION', async () => {
  const { port, db } = memoryPort();
  await migrateStore(port);
  await migrateStore(port);
  expect({ ...Object(version(db)) }).toEqual({ user_version: STORE_VERSION });
  expect(db.prepare('select count(*) as n from sync_state').all()).toEqual([
    expect.objectContaining({ n: 1 }),
  ]);
});

test('the same version keeps the rows; another version starts empty (a full resync)', async () => {
  const { port, db } = memoryPort();
  const store = createMessageStore(port);
  await store.open('user-a');
  await applyAs(store, plan([row({ n: 1 })]), 'user-a');
  await migrateStore(port);
  expect(await store.chat('user-a', A, 10)).toHaveLength(1);
  db.exec('pragma user_version = 0');
  await store.open('user-a');
  expect(await store.chat('user-a', A, 10)).toEqual([]);
  expect(await store.state()).toEqual({ cursor: null, more: false, scope: null });
});
