import type { SyncPlan } from '@ab/client-core';
import { stampMicros, type SyncMessage, type ThreadView } from '@ab/shared';
import type { SqlPort, SqlValue } from './sql-port';

// The store's writes (docs/43 43-6); the caller runs them inside one transaction.

const UPSERT_MESSAGE = `insert or replace into messages
  (id, phone, created_us, updated_at, status, direction, json) values (?, ?, ?, ?, ?, ?, ?)`;
const UPSERT_THREAD = `insert or replace into threads
  (phone, last_message_id, last_us, unread, json) values (?, ?, ?, ?, ?)`;

/** Microseconds since the epoch: a safe integer until the year 2255. */
const micros = (at: string): number => Number(stampMicros(at));

const messageValues = (m: SyncMessage): SqlValue[] => [
  m.id,
  m.phone_e164,
  micros(m.created_at),
  m.updated_at,
  m.status,
  m.direction,
  JSON.stringify(m),
];

const threadValues = (t: ThreadView): SqlValue[] => [
  t.phone_e164,
  t.last_message_id,
  micros(t.last_message_at),
  t.unread_count,
  JSON.stringify(t),
];

/** Every row and chats-list row gone; the sync mark back to a first sync, for `owner`. */
export async function clearRows(port: SqlPort, owner: string | null): Promise<void> {
  await port.exec('delete from messages; delete from threads;');
  const sql = 'update sync_state set owner = ?, cursor = null, more = 0, scope = null where k = 1';
  await port.run(sql, [owner]);
}

/** One sync answer's plan (planSync): reset, tombstones, rows, chats-list rows, the mark. */
export async function writePlan(port: SqlPort, plan: SyncPlan): Promise<void> {
  if (plan.reset) await port.exec('delete from messages; delete from threads;');
  // A chats-list row whose last message is gone goes too: the list falls back to its HTTP row.
  for (const id of plan.remove) {
    await port.run('delete from messages where id = ?', [id]);
    await port.run('delete from threads where last_message_id = ?', [id]);
  }
  for (const m of plan.upsert) await port.run(UPSERT_MESSAGE, messageValues(m));
  for (const t of plan.threads) await port.run(UPSERT_THREAD, threadValues(t));
  const { cursor, more, scope } = plan.state;
  const sql = 'update sync_state set cursor = ?, more = ?, scope = ? where k = 1';
  await port.run(sql, [cursor, more ? 1 : 0, scope]);
}

/** Rows merged from a chat read (mergeRead): inserted or replaced by id. */
export async function writeRows(port: SqlPort, rows: readonly SyncMessage[]): Promise<void> {
  for (const m of rows) await port.run(UPSERT_MESSAGE, messageValues(m));
}
