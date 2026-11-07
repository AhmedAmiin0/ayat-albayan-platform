import { NIL_UUID, type SyncCursor } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { MESSAGE_SELECT, type ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { phoneList } from '@/modules/messaging/numbers';
import { check } from '@/modules/messaging/inbox/threads/store/check';

/** The thread page's own select (DeltaRepo): the row with its lesson, teacher and staff sender. */
const SELECT = `${MESSAGE_SELECT}, lesson:lessons(starts_at, ends_at, status)` as const;
/** Before every row: a first sync starts here. */
export const SYNC_START: SyncCursor = { at: '1970-01-01T00:00:00+00:00', id: NIL_UUID };

/** A deleted message: its id and chat, stamped when the DELETE ran. */
export interface TombstoneRow {
  id: string;
  phone_e164: string;
  deleted_at: string;
}

/** One keyset page of GET /threads/sync, as the caller's scope narrows it (ThreadSyncService). */
interface SyncPageInput {
  after: SyncCursor;
  limit: number;
  /** null = every chat (admin, sales); a teacher's scope phones otherwise (never empty). */
  phones: readonly string[] | null;
  /** The academy's own numbers: never synced, for any role. */
  hide: readonly string[];
}

/** The PostgREST calls both reads share (a messages or a message_tombstones builder). */
interface Keyset<Q> {
  gte(column: string, value: string): Q;
  or(filters: string): Q;
  not(column: string, op: 'in', value: string): Q;
  in(column: string, values: readonly string[]): Q;
  order(column: string, opts: { ascending: boolean }): Q;
}

/** After (stamp, id) in the caller's scope, oldest first; the caller adds `.limit`. */
function keyset<Q extends Keyset<Q>>(q: Q, stamp: string, input: SyncPageInput): Q {
  const { at, id } = input.after;
  const after = q.gte(stamp, at).or(`${stamp}.gt."${at}",id.gt.${id}`);
  const shown = input.hide.length > 0 ? after.not('phone_e164', 'in', phoneList(input.hide)) : after;
  const scoped = input.phones ? shown.in('phone_e164', input.phones) : shown;
  return scoped.order(stamp, { ascending: true }).order('id', { ascending: true });
}

/** messages and their tombstones after the cursor, oldest change first (migration 1200 indexes). */
@Injectable()
export class SyncRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** `limit + 1` rows: the extra one tells the caller the page was full. */
  async page(input: SyncPageInput): Promise<ThreadMessageRow[]> {
    const q = keyset(this.db.from('messages').select(SELECT), 'updated_at', input);
    const { data, error } = await q.limit(input.limit + 1);
    check(error, 'thread sync read');
    return data;
  }

  /** Rows DELETEd after the cursor, same scope, `limit + 1` (message_tombstones). */
  async tombstones(input: SyncPageInput): Promise<TombstoneRow[]> {
    const from = this.db.from('message_tombstones').select('id, phone_e164, deleted_at');
    const { data, error } = await keyset(from, 'deleted_at', input).limit(input.limit + 1);
    check(error, 'thread sync tombstones read');
    return data;
  }
}
