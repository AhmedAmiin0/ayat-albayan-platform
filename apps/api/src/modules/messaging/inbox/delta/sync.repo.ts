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

/** One keyset page of GET /threads/sync, as the caller's scope narrows it (ThreadSyncService). */
interface SyncPageInput {
  after: SyncCursor;
  limit: number;
  /** null = every chat (admin, sales); a teacher's scope phones otherwise (never empty). */
  phones: readonly string[] | null;
  /** The academy's own numbers: never synced, for any role. */
  hide: readonly string[];
}

/** messages after (updated_at, id), oldest change first, on messages_updated_at_id_idx (1200). */
@Injectable()
export class SyncRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** `limit + 1` rows: the extra one tells the caller the page was full. */
  async page(input: SyncPageInput): Promise<ThreadMessageRow[]> {
    const { at, id } = input.after;
    const base = this.db
      .from('messages')
      .select(SELECT)
      .gte('updated_at', at)
      .or(`updated_at.gt."${at}",id.gt.${id}`);
    const shown =
      input.hide.length > 0 ? base.not('phone_e164', 'in', phoneList(input.hide)) : base;
    const scoped = input.phones ? shown.in('phone_e164', [...input.phones]) : shown;
    const { data, error } = await scoped
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(input.limit + 1);
    check(error, 'thread sync read');
    return data;
  }
}
