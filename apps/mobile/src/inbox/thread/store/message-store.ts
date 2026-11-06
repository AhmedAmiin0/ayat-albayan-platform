import { type HeldStamp, mergeRead, type SyncPlan, type SyncState } from '@ab/client-core';
import type { MessageView, SyncMessage, ThreadView } from '@ab/shared';
import type { SqlPort } from './sql-port';
import { migrateStore } from './store-schema';
import { readChat, readHeld, readRows, readState, readThreads } from './store-read';
import { changedPhones, type StoreChange } from './store-change';
import { createQueue } from './store-queue';
import { clearRows, writePlan, writeRows } from './store-write';

/**
 * The phone's inbox store (docs/43 §5, 43-6): one row per message, keyed by id; the chats-list
 * rows; the sync mark. It belongs to ONE signed-in user (sync_state.owner): opened for another
 * user it is wiped first, and a write planned for a user who is no longer the owner (a sign-out
 * or an account switch while a sync was out) is dropped. Writes run one at a time, in order.
 */
export interface MessageStore {
  /** Ready for `owner`: migrated, and wiped when it held another account's rows. */
  open(owner: string): Promise<void>;
  state(): Promise<SyncState>;
  /** The stored sync stamps of these ids, for planSync. */
  held(ids: readonly string[]): Promise<HeldStamp>;
  /** Writes a plan for `owner`; false (nothing written) when the store is no longer theirs. */
  apply(plan: SyncPlan, owner: string): Promise<boolean>;
  /** Rows from a chat read or a send's answer, merged by id (mergeRead), for `owner`. */
  putReads(rows: readonly MessageView[], owner: string): Promise<boolean>;
  chat(phone: string, limit: number): Promise<SyncMessage[]>;
  threads(): Promise<ThreadView[]>;
  /** Sign-out: every row and the owner gone. */
  wipe(): Promise<void>;
  /** Called after each write with what changed. */
  subscribe(listener: (change: StoreChange) => void): () => void;
}

const owns = async (port: SqlPort, owner: string) => (await readState(port)).owner === owner;

/** A sync plan written for `owner`; null (nothing written) when the store is not theirs. */
async function writeFor(port: SqlPort, plan: SyncPlan, owner: string): Promise<StoreChange | null> {
  if (!(await owns(port, owner))) return null;
  const removed = await readHeld(port, plan.remove);
  await port.transaction(() => writePlan(port, plan));
  return changedPhones(plan, removed);
}

/** Chat-read rows merged by id for `owner`; null when the store is not theirs. */
async function putFor(
  port: SqlPort,
  rows: readonly MessageView[],
  owner: string,
): Promise<StoreChange | null> {
  if (!(await owns(port, owner))) return null;
  const held = await readRows(port, rows.map((m) => m.id));
  const merged = rows.map((m) => mergeRead(held.get(m.id), m));
  await port.transaction(() => writeRows(port, merged));
  return new Set(merged.map((m) => m.phone_e164));
}

export function createMessageStore(port: SqlPort): MessageStore {
  const listeners = new Set<(change: StoreChange) => void>();
  const tell = (change: StoreChange) => listeners.forEach((l) => l(change));
  const serial = createQueue();
  const commit = (change: StoreChange | null) => {
    if (change) tell(change);
    return change !== null;
  };
  return {
    open: (owner) =>
      serial(async () => {
        await migrateStore(port);
        if (await owns(port, owner)) return;
        // Another account's rows (or a wiped file): nothing of them is ever read by this one.
        await port.transaction(() => clearRows(port, owner));
        tell('all');
      }),
    state: async () => (await readState(port)).sync,
    held: async (ids) => {
      const rows = new Map((await readHeld(port, ids)).map((r) => [r.id, r.updated_at]));
      return (id) => rows.get(id);
    },
    apply: (plan, owner) => serial(async () => commit(await writeFor(port, plan, owner))),
    putReads: (rows, owner) => serial(async () => commit(await putFor(port, rows, owner))),
    chat: (phone, limit) => readChat(port, phone, limit),
    threads: () => readThreads(port),
    wipe: () =>
      serial(async () => {
        await port.transaction(() => clearRows(port, null));
        tell('all');
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
