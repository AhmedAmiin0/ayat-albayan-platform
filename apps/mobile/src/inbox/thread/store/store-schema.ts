import { z } from 'zod';
import type { SqlPort } from './sql-port';

/**
 * The store's schema version (PRAGMA user_version). A bump drops every table and resyncs
 * from the first row (docs/43 §6: a full resync on a user_version bump).
 */
export const STORE_VERSION = 1;

const TABLES = ['messages', 'threads', 'sync_state'] as const;

const CREATE = `
create table if not exists messages (
  id text primary key, phone text not null, created_at text not null,
  updated_at text not null, status text not null, direction text not null, json text not null
);
create index if not exists messages_chat on messages (phone, created_at desc, id desc);
create table if not exists threads (
  phone text primary key, last_message_id text not null, last_at text not null,
  unread integer not null, json text not null
);
create table if not exists sync_state (
  k integer primary key check (k = 1), owner text, cursor text,
  more integer not null default 0, scope text
);
insert or ignore into sync_state (k) values (1);`;

const versionRow = z.array(z.object({ user_version: z.number() }));

async function version(port: SqlPort): Promise<number> {
  const [row] = versionRow.parse(await port.all('pragma user_version', []));
  return row?.user_version ?? 0;
}

/** Brings the file to STORE_VERSION: a file of another version starts empty. */
export async function migrateStore(port: SqlPort): Promise<void> {
  const current = await version(port);
  const drop = TABLES.map((t) => `drop table if exists ${t};`).join('\n');
  const reset = current === STORE_VERSION ? '' : drop;
  await port.exec(`${reset}${CREATE}\npragma user_version = ${STORE_VERSION};`);
}
