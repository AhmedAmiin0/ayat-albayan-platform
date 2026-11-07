import type { LiveRow } from '@ab/client-core';
import type { MessageStatus, SyncMessage, ThreadSync } from '@ab/shared';
import { encodeSyncCursor } from '@ab/shared';
import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, answer, at, id, row, threadRow } from './store-fixtures';
import { createSyncEngine } from './sync-engine';

// docs/44 K1 on mobile: a live tick is a visual patch of the store; no sync is folded. The
// event's sync joins a run in flight and asks for exactly one more after it: that extra run
// starts after the event, so the last write is always the server's newest.

const ON = { owner: 'user-a', phone: A };
const live = (s: MessageStatus): LiveRow => ({ id: id(1), s, d: 'outbound', at: '' });
/** Row 1 as the sync answers it at second `s` (newer each time). */
const synced = (s: number, over: Partial<SyncMessage>): ThreadSync =>
  answer({
    messages: [{ ...row({ n: 1 }), updated_at: at(s), ...over }],
    threads: [{ ...threadRow(A, 1), last_status: over.status ?? 'sent' }],
    cursor: encodeSyncCursor({ at: at(s), id: id(1) }),
  });

async function setup(first: Partial<SyncMessage>) {
  const store = createMessageStore(memoryPort().port);
  const answers: Promise<ThreadSync>[] = [Promise.resolve(synced(1, first))];
  const fetchPage = jest.fn(() => answers.shift() ?? Promise.reject(new Error('offline')));
  const engine = createSyncEngine({ store, owner: 'user-a', fetchPage });
  await engine.syncNow();
  const stored = async () => (await store.chat('user-a', A, 10))[0];
  const listed = async () => (await store.threads('user-a'))[0]?.last_status;
  const next = (page: ThreadSync | Promise<ThreadSync>) => answers.push(Promise.resolve(page));
  return { store, engine, fetchPage, stored, listed, next };
}

test('patch, an older sync in flight lands, the extra sync lands the newest: the server wins', async () => {
  const t = await setup({ status: 'sent' });
  let land = (_: ThreadSync): void => undefined;
  t.next(new Promise<ThreadSync>((resolve) => (land = resolve)));
  const run = t.engine.syncNow();
  await waitFor(() => t.fetchPage.mock.calls.length === 2); // the older request is out
  await t.store.live([live('delivered')], ON);
  expect((await t.stored())?.status).toBe('delivered');
  void t.engine.syncNow(); // the event's sync: joins the run, asks for one more after it
  t.next(synced(3, { status: 'read', read_at: at(3) }));
  land(synced(2, { status: 'sent' }));
  await run;
  let newest: unknown[] = [];
  await settle(async () => (newest = [(await t.stored())?.read_at, await t.listed()])[1] === 'read');
  expect(newest).toEqual([at(3), 'read']);
  expect(t.fetchPage).toHaveBeenCalledTimes(3); // exactly one extra run
});

test('a re-queue (failed → queued): the patch never takes a row off failed; the sync does', async () => {
  const t = await setup({ status: 'failed' });
  await t.store.live([live('queued')], ON);
  expect((await t.stored())?.status).toBe('failed');
  t.next(synced(2, { status: 'queued' }));
  await t.engine.syncNow();
  expect([(await t.stored())?.status, await t.listed()]).toEqual(['queued', 'queued']);
});

test('a sent event moves the tick; the next sync makes the row replyable', async () => {
  const t = await setup({ status: 'queued', replyable: false });
  await t.store.live([live('sent')], ON);
  expect((await t.stored())?.status).toBe('sent');
  t.next(synced(2, { status: 'sent', replyable: true }));
  await t.engine.syncNow();
  expect((await t.stored())?.replyable).toBe(true);
});

const tick = () => new Promise((r) => setTimeout(r, 1));

/** Lets the engine run until `done` (its store reads are real async SQLite calls). */
async function waitFor(done: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !done(); i += 1) await tick();
}

/** waitFor with an async check (a store read). */
async function settle(done: () => Promise<boolean>): Promise<void> {
  for (let i = 0; i < 100 && !(await done()); i += 1) await tick();
}
