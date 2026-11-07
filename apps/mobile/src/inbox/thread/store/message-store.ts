import type { HeldStamp, SyncPlan, SyncState } from '@ab/client-core';
import type { MessageView, SyncMessage, ThreadView } from '@ab/shared';
import type { SqlPort } from './sql-port';
import type { StoreChange } from './store-change';
import { owns, type PlanBase, putFor, rememberGone, writeFor } from './store-guard';
import { createQueue } from './store-queue';
import { readChat, readHeld, readState, readThreads } from './store-read';
import { migrateStore } from './store-schema';
import { clearRows } from './store-write';

/**
 * The phone's inbox store (docs/43 §5, 43-6): one row per message, keyed by id; the chats-list
 * rows; the sync mark. It belongs to ONE signed-in user (sync_state.owner): opened for another
 * user it is wiped first; every read and write names its owner and gets nothing / writes nothing
 * for anyone else (a sign-out or an account switch while a sync was out). Writes run one at a
 * time, in order.
 */
export interface MessageStore {
  /** Ready for `owner`: migrated, and wiped when it held another account's rows. */
  open(owner: string): Promise<void>;
  state(): Promise<SyncState>;
  /** The stored sync stamps of these ids, for planSync. */
  held(ids: readonly string[]): Promise<HeldStamp>;
  /** Writes a plan; false (nothing written) when the store is not the owner's or moved on. */
  apply(plan: SyncPlan, at: PlanBase): Promise<boolean>;
  /** Rows from a chat read or a send's answer, merged by id (mergeRead), for `owner`. */
  putReads(rows: readonly MessageView[], owner: string): Promise<boolean>;
  /** One chat's newest rows, newest first; [] when the store is not `owner`'s. */
  chat(owner: string, phone: string, limit: number): Promise<SyncMessage[]>;
  /** The chats-list rows; [] when the store is not `owner`'s. */
  threads(owner: string): Promise<ThreadView[]>;
  /** Sign-out: every row and the owner gone. */
  wipe(): Promise<void>;
  /** Called after each write with what changed. */
  subscribe(listener: (change: StoreChange) => void): () => void;
}

export function createMessageStore(port: SqlPort): MessageStore {
  const listeners = new Set<(change: StoreChange) => void>();
  const gone = new Set<string>();
  const tell = (change: StoreChange) => listeners.forEach((l) => l(change));
  const serial = createQueue();
  const commit = (change: StoreChange | null) => {
    if (change) tell(change);
    return change !== null;
  };
  const clear = async (owner: string | null) => {
    gone.clear();
    await port.transaction(() => clearRows(port, owner));
    tell('all');
  };
  const ownerRead = async <T>(owner: string, read: () => Promise<T[]>): Promise<T[]> =>
    (await owns(port, owner)) ? read() : [];
  return {
    open: (owner) =>
      serial(async () => {
        await migrateStore(port);
        // Another account's rows (or a wiped file): nothing of them is ever read by this one.
        if (!(await owns(port, owner))) await clear(owner);
      }),
    state: async () => (await readState(port)).sync,
    held: async (ids) => {
      const rows = new Map((await readHeld(port, ids)).map((r) => [r.id, r.updated_at]));
      return (id) => rows.get(id);
    },
    apply: (plan, at) =>
      serial(async () => {
        const change = await writeFor(port, plan, at);
        if (change) rememberGone(gone, plan.remove);
        return commit(change);
      }),
    putReads: (rows, owner) =>
      serial(async () => commit(await putFor(port, rows, { owner, gone }))),
    chat: (owner, phone, limit) => ownerRead(owner, () => readChat(port, phone, limit)),
    threads: (owner) => ownerRead(owner, () => readThreads(port)),
    wipe: () => serial(() => clear(null)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
