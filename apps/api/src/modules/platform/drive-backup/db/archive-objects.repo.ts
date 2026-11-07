import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { ArchiveRow } from '@/modules/platform/drive-backup/plan/archive.types';
import { objectId } from '@/modules/platform/drive-backup/plan/parts';
import type { FinishedArchive } from '@/modules/platform/drive-backup/run/backup-store.port';
import { fail } from './archive-row.schema';

const PAGE = 1000;
const BATCH = 500;

/** drive_backup_objects with the service role: what each archive holds (DriveBackupRepo's). */
@Injectable()
export class ArchiveObjectsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  private async page(archiveId: string, from: number) {
    const { data, error } = await this.db
      .from('drive_backup_objects')
      .select('bucket, key, etag')
      .eq('archive_id', archiveId)
      .order('bucket')
      .order('key')
      .range(from, from + PAGE - 1);
    if (error) throw fail('objects read', error);
    return data;
  }

  /** Archive by archive, oldest first, page by page: a later ETag replaces an earlier one. */
  async covered(archives: readonly ArchiveRow[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const ordered = [...archives].sort((a, b) => a.started_at.localeCompare(b.started_at));
    for (const a of ordered) {
      for (let from = 0, more = true; more; from += PAGE) {
        const page = await this.page(a.id, from);
        page.forEach((o) => out.set(objectId(o), o.etag));
        more = page.length === PAGE;
      }
    }
    return out;
  }

  /** The objects an archive holds, in batches (a re-run keeps the rows already there). */
  async write(input: FinishedArchive): Promise<void> {
    const rows = input.entries.map((e) => ({
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
