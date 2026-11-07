import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { FROZEN_REASONS } from '@/modules/platform/drive-backup/plan/frozen';
import { fail, RECENT_COLUMNS, recentRowSchema, type RecentRow } from './archive-row.schema';

const stateSchema = z.object({
  folder_id: z.string().nullable(),
  account_email: z.string().nullable(),
  quota_limit: z.number().nullable(),
  quota_usage: z.number().nullable(),
  quota_at: z.string().nullable(),
  last_run_at: z.string().nullable(),
  last_error: z.string().nullable(),
  /** The open full's first part, when it has been open for more than 3 nights (plan/frozen.ts). */
  frozen_since: z.string().nullable(),
  frozen_reason: z.enum(FROZEN_REASONS).nullable(),
});
export type BackupState = z.infer<typeof stateSchema>;

const EMPTY: BackupState = {
  folder_id: null,
  account_email: null,
  quota_limit: null,
  quota_usage: null,
  quota_at: null,
  last_run_at: null,
  last_error: null,
  frozen_since: null,
  frozen_reason: null,
};
const COLUMNS =
  'folder_id, account_email, quota_limit, quota_usage, quota_at, last_run_at, last_error, frozen_since, frozen_reason';

/** drive_backup_state (one row) and the status line's recent archives, with the service role. */
@Injectable()
export class BackupStateRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async read(): Promise<BackupState> {
    const { data, error } = await this.db
      .from('drive_backup_state')
      .select(COLUMNS)
      .eq('id', true)
      .maybeSingle();
    if (error) throw fail('state read', error);
    return data === null ? EMPTY : stateSchema.parse(data);
  }

  async save(patch: Partial<BackupState>): Promise<void> {
    const row = { id: true, ...patch, updated_at: new Date().toISOString() };
    const { error } = await this.db.from('drive_backup_state').upsert(row);
    if (error) throw fail('state write', error);
  }

  /** The folder's latest archives (done or failed), newest first. */
  async recent(folderId: string): Promise<RecentRow[]> {
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .select(RECENT_COLUMNS)
      .eq('folder_id', folderId)
      .in('status', ['done', 'failed'])
      .order('started_at', { ascending: false })
      .limit(40);
    if (error) throw fail('recent read', error);
    return recentRowSchema.array().parse(data);
  }
}
