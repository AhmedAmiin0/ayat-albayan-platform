import {
  EMPTY_SYNC,
  jsonText,
  syncMessageSchema,
  syncThreadSchema,
  type SyncState,
} from '@ab/client-core';
import type { SyncMessage, ThreadView } from '@ab/shared';
import { z } from 'zod';
import type { SqlPort } from './sql-port';

// The store's reads (docs/43 43-6). Every row is parsed back with zod (rule 12).

/** At most this many ids in one `in (…)` (SQLite's bound-parameter limit is far above). */
const IDS_PER_QUERY = 500;

const stateRows = z.array(
  z
    .object({
      owner: z.string().nullable(),
      cursor: z.string().nullable(),
      more: z.number(),
      scope: z.string().nullable(),
    })
    .transform(({ owner, cursor, more, scope }) => ({
      owner,
      sync: { cursor, more: more === 1, scope },
    })),
);
const messageRows = z.array(z.object({ json: jsonText(syncMessageSchema) }));
const threadRows = z.array(z.object({ json: jsonText(syncThreadSchema) }));
const heldRows = z.array(z.object({ id: z.string(), phone: z.string(), updated_at: z.string() }));

/** A stored row's place: its chat and its sync stamp. */
export type HeldRow = z.infer<typeof heldRows>[number];

/** Who the rows belong to, and the sync mark stored with them. */
interface StoreState {
  owner: string | null;
  sync: SyncState;
}

const NO_STATE: StoreState = { owner: null, sync: EMPTY_SYNC };

/** The sync_state row (migrateStore always writes it; none reads as an empty store). */
export async function readState(port: SqlPort): Promise<StoreState> {
  const [row] = stateRows.parse(await port.all('select * from sync_state where k = 1', []));
  return row ?? NO_STATE;
}

/** One chat's newest `limit` rows, newest first (the chat list renders inverted). */
export async function readChat(
  port: SqlPort,
  phone: string,
  limit: number,
): Promise<SyncMessage[]> {
  const sql = `select json from messages where phone = ?
    order by created_us desc, id desc limit ?`;
  return messageRows.parse(await port.all(sql, [phone, limit])).map((r) => r.json);
}

/** Every stored chats-list row, the latest activity first. */
export async function readThreads(port: SqlPort): Promise<ThreadView[]> {
  const sql = 'select json from threads order by last_us desc, phone';
  return threadRows.parse(await port.all(sql, [])).map((r) => r.json);
}

const chunks = <T>(items: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / IDS_PER_QUERY) }, (_, i) =>
    items.slice(i * IDS_PER_QUERY, (i + 1) * IDS_PER_QUERY),
  );

/** The stored rows among `ids` (missing ones are simply absent). */
export async function readHeld(port: SqlPort, ids: readonly string[]): Promise<HeldRow[]> {
  const pages = chunks(ids).map(async (part) => {
    const marks = part.map(() => '?').join(',');
    const sql = `select id, phone, updated_at from messages where id in (${marks})`;
    return heldRows.parse(await port.all(sql, part));
  });
  return (await Promise.all(pages)).flat();
}

/** The stored copies among `ids`, by id (a chat read is merged over them: mergeRead). */
export async function readRows(
  port: SqlPort,
  ids: readonly string[],
): Promise<Map<string, SyncMessage>> {
  const pages = chunks(ids).map(async (part) => {
    const sql = `select json from messages where id in (${part.map(() => '?').join(',')})`;
    return messageRows.parse(await port.all(sql, part)).map((r) => r.json);
  });
  return new Map((await Promise.all(pages)).flat().map((m) => [m.id, m]));
}
