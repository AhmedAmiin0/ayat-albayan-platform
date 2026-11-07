import {
  applyLiveRows,
  laterStatus,
  type LiveRow,
  mergeRead,
  type SyncPlan,
  type SyncState,
} from '@ab/client-core';
import type { MessageStatus, MessageView, SyncMessage } from '@ab/shared';
import type { SqlPort } from './sql-port';
import { changedPhones, type StoreChange } from './store-change';
import { readHeld, readRows, readState, readThreadsOf } from './store-read';
import { writePlan, writeRows, writeThreads } from './store-write';

// The store's guarded writes (docs/43 43-6): each runs only for the owner it was made for, and a
// sync plan only over the mark it was planned from (compare-and-set).

/** Who a sync plan is for and the mark it was planned from (store.state() before the ask). */
export interface PlanBase {
  owner: string;
  base: SyncState;
}

/** The ids tombstoned in this session: a chat read in flight never brings one back. */
const GONE_CAP = 10_000;

export const owns = async (port: SqlPort, owner: string): Promise<boolean> =>
  (await readState(port)).owner === owner;

const sameMark = (a: SyncState, b: SyncState): boolean =>
  a.cursor === b.cursor && a.scope === b.scope && a.more === b.more;

/** Remembers tombstoned ids (oldest dropped past GONE_CAP). */
export function rememberGone(gone: Set<string>, ids: readonly string[]): void {
  ids.forEach((id) => gone.add(id));
  const over = [...gone].slice(0, Math.max(0, gone.size - GONE_CAP));
  over.forEach((id) => gone.delete(id));
}

/**
 * A sync plan, written only when the store is still `owner`'s and still holds the mark it was
 * planned from (a wipe, a scope reset or another run moved it: the plan is stale, dropped).
 */
export async function writeFor(
  port: SqlPort,
  plan: SyncPlan,
  { owner, base }: PlanBase,
): Promise<StoreChange | null> {
  const now = await readState(port);
  if (now.owner !== owner || !sameMark(now.sync, base)) return null;
  const removed = await readHeld(port, plan.remove);
  await port.transaction(() => writePlan(port, plan));
  return changedPhones(plan, removed);
}

/** Field by field, whatever the key order (a stored row comes back through its schema). */
function sameRow(a: SyncMessage, b: SyncMessage | undefined): boolean {
  const other = new Map(Object.entries(b ?? {}));
  const fields = Object.entries(a);
  const equal = ([k, v]: [string, unknown]) => JSON.stringify(v) === JSON.stringify(other.get(k));
  return b !== undefined && fields.length === other.size && fields.every(equal);
}

/** Chat-read rows merged by id for `owner`; a tombstoned id is never written back. */
export async function putFor(
  port: SqlPort,
  rows: readonly MessageView[],
  at: { owner: string; gone: ReadonlySet<string> },
): Promise<StoreChange | null> {
  if (!(await owns(port, at.owner))) return null;
  const live = rows.filter((m) => !at.gone.has(m.id));
  const held = await readRows(
    port,
    live.map((m) => m.id),
  );
  const same = (m: SyncMessage) => sameRow(m, held.get(m.id));
  const merged = live.map((m) => mergeRead(held.get(m.id), m)).filter((m) => !same(m));
  await port.transaction(() => writeRows(port, merged));
  return new Set(merged.map((m) => m.phone_e164));
}

/** A live write: the chats it changed (null: not `owner`'s), and whether it held every row. */
export interface LiveWrite {
  change: StoreChange | null;
  complete: boolean;
}

/**
 * A realtime event's ticks (docs/44 K1) for `owner`: each stored row of chat `phone` among `rows`
 * takes the incoming status by laterStatus, and so does a chats-list row whose last message it is.
 * Only the tick moves (updated_at stays: the next sync still lands the server's row over it).
 */
export async function liveFor(
  port: SqlPort,
  rows: readonly LiveRow[],
  at: { owner: string; phone: string },
): Promise<LiveWrite> {
  if (!(await owns(port, at.owner))) return { change: null, complete: false };
  const held = await readRows(
    port,
    rows.map((r) => r.id),
  );
  const ours = [...held.values()].filter((m) => m.phone_e164 === at.phone);
  const statuses = new Map(ours.map((m) => [m.id, m.status]));
  const { incoming, complete } = applyLiveRows(rows, (id) => statuses.get(id));
  const next = (id: string, status: MessageStatus) =>
    laterStatus(status, incoming.get(id) ?? status);
  const moved = ours
    .filter((m) => next(m.id, m.status) !== m.status)
    .map((m) => ({ ...m, status: next(m.id, m.status) }));
  const lists = (await readThreadsOf(port, [...incoming.keys()]))
    .filter((t) => next(t.last_message_id, t.last_status) !== t.last_status)
    .map((t) => ({ ...t, last_status: next(t.last_message_id, t.last_status) }));
  await port.transaction(async () => {
    await writeRows(port, moved);
    await writeThreads(port, lists);
  });
  return { change: new Set([...moved, ...lists].map((r) => r.phone_e164)), complete };
}
