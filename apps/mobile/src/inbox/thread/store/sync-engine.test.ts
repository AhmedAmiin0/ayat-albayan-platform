import type { ThreadSync } from '@ab/shared';
import { encodeSyncCursor } from '@ab/shared';
import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, answer, at, id, row, threadRow } from './store-fixtures';
import { createSyncEngine, SYNC_MAX_PAGES } from './sync-engine';

// The sync loop against a real SQLite store and a scripted GET /threads/sync (docs/43 43-6).

const cursor = (n: number) => encodeSyncCursor({ at: at(n), id: id(n) });

function setup(pages: ThreadSync[], owner = 'user-a') {
  const store = createMessageStore(memoryPort().port);
  const asked: (string | undefined)[] = [];
  const fetchPage = jest.fn(async (since: string | undefined) => {
    asked.push(since);
    const next = pages.shift();
    if (!next) throw new Error('offline');
    return next;
  });
  const engine = createSyncEngine({ store, owner, fetchPage });
  return { store, engine, asked, fetchPage };
}

test('a first sync asks with no cursor, follows full pages at once, then stores the mark', async () => {
  const t = setup([
    answer({ messages: [row({ n: 1 })], cursor: cursor(1), has_more: true }),
    answer({ messages: [row({ n: 2 })], threads: [threadRow(A, 2)], cursor: cursor(2) }),
  ]);
  await t.engine.syncNow();
  expect(t.asked).toEqual([undefined, cursor(1)]);
  expect((await t.store.chat(A, 10)).map((m) => m.id)).toEqual([id(2), id(1)]);
  expect(await t.store.state()).toEqual({ cursor: cursor(2), more: false, scope: 'admin:1' });
});

test('a caught-up store re-asks from the mark minus the overlap; a repeat changes nothing', async () => {
  const page = () => answer({ messages: [row({ n: 2 })], cursor: cursor(2) });
  const t = setup([page(), page()]);
  await t.engine.syncNow();
  await t.engine.syncNow();
  expect(t.asked[1]).toMatch(/^2026-11-06T09:59:52\.000Z~0{8}-/);
  expect(await t.store.chat(A, 10)).toEqual([row({ n: 2 })]);
});

test('tombstones in an answer delete the rows', async () => {
  const t = setup([
    answer({ messages: [row({ n: 1 }), row({ n: 2 })], cursor: cursor(2) }),
    answer({ gone: [id(1)], cursor: cursor(3) }),
  ]);
  await t.engine.syncNow();
  await t.engine.syncNow();
  expect((await t.store.chat(A, 10)).map((m) => m.id)).toEqual([id(2)]);
});

test('a new scope wipes and syncs again from the first row', async () => {
  const t = setup([
    answer({ messages: [row({ n: 1 })], cursor: cursor(1), scope: 'teacher:1' }),
    answer({ messages: [row({ n: 9 })], cursor: cursor(9), scope: 'teacher:2' }),
    answer({ messages: [row({ n: 3 })], cursor: cursor(3), scope: 'teacher:2' }),
  ]);
  await t.engine.syncNow();
  await t.engine.syncNow();
  expect(t.asked[2]).toBeUndefined();
  expect((await t.store.chat(A, 10)).map((m) => m.id)).toEqual([id(3)]);
});

test('a failed ask keeps the mark; the next run asks from it again', async () => {
  const t = setup([answer({ messages: [row({ n: 1 })], cursor: cursor(1) })]);
  await t.engine.syncNow();
  await t.engine.syncNow(); // no page left: offline
  expect(await t.store.state()).toMatchObject({ cursor: cursor(1) });
});

test('a run yields after SYNC_MAX_PAGES full pages', async () => {
  const full = (n: number) =>
    answer({ messages: [row({ n })], cursor: cursor(n % 60), has_more: true });
  const t = setup(Array.from({ length: SYNC_MAX_PAGES + 5 }, (_, i) => full(i + 1)));
  await t.engine.syncNow();
  expect(t.fetchPage).toHaveBeenCalledTimes(SYNC_MAX_PAGES);
});
