import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { versionId } from '@/modules/platform/drive-backup/plan/parts';
import type { FinishedArchive } from '@/modules/platform/drive-backup/run/backup-store.port';
import { fail } from './archive-row.schema';

const PAGE = 1000;
const BATCH = 500;

/** drive_backup_objects with the service role: every version backed up (DriveBackupRepo's). */
@Injectable()
export class ArchiveObjectsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async page(folderId: string, from: number) {
    const { data, error } = await this.db
      .from('drive_backup_objects')
      .select('bucket, key, etag')
      .eq('folder_id', folderId)
      .order('bucket')
      .order('key')
      .order('etag')
      .range(from, from + PAGE - 1);
    if (error) throw fail('objects read', error);
    return data;
  }

  /** Every version recorded for the folder, page by page (PostgREST caps an answer at 1000). */
  async covered(folderId: string): Promise<Set<string>> {
    const out = new Set<string>();
    for (let from = 0, more = true; more; from += PAGE) {
      const page = await this.page(folderId, from);
      page.forEach((o) => out.add(versionId(o)));
      more = page.length === PAGE;
    }
    return out;
  }

  /** The objects a part holds, in batches; a version already recorded keeps its first row. */
  async write(input: FinishedArchive): Promise<void> {
    const rows = input.entries.map((e) => ({
      folder_id: input.folderId,
      archive_id: input.id,
      bucket: e.bucket,
      key: e.key,
      etag: e.etag,
      size: e.size,
    }));
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await this.db
        .from('drive_backup_objects')
        .upsert(rows.slice(i, i + BATCH), { ignoreDuplicates: true });
      if (error) throw fail('objects write', error);
    }
  }
}
