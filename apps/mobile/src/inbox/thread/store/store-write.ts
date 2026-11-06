import type { SyncPlan } from '@ab/client-core';
import type { SyncMessage, ThreadView } from '@ab/shared';
import type { SqlPort, SqlValue } from './sql-port';

// The store's writes (docs/43 43-6); the caller runs them inside one transaction.

const UPSERT_MESSAGE = `insert or replace into messages
  (id, phone, created_at, updated_at, status, direction, json) values (?, ?, ?, ?, ?, ?, ?)`;
const UPSERT_THREAD = `insert or replace into threads
  (phone, last_message_id, last_at, unread, json) values (?, ?, ?, ?, ?)`;

const messageValues = (m: SyncMessage): SqlValue[] => [
  m.id,
  m.phone_e164,
  m.created_at,
  m.updated_at,
  m.status,
  m.direction,
  JSON.stringify(m),
];

const threadValues = (t: ThreadView): SqlValue[] => [
  t.phone_e164,
  t.last_message_id,
  t.last_message_at,
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
  for (const id of plan.remove) await port.run('delete from messages where id = ?', [id]);
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
