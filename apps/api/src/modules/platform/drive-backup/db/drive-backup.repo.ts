import type { Database } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { ArchiveRow } from '@/modules/platform/drive-backup/plan/archive.types';
import { objectId } from '@/modules/platform/drive-backup/plan/parts';
import type {
  BackupStore,
  FinishedArchive,
  NewArchive,
} from '@/modules/platform/drive-backup/run/backup-store.port';
import { ARCHIVE_COLUMNS, archiveRowSchema, fail } from './archive-row.schema';

const PAGE = 1000;
const BATCH = 500;
const now = () => new Date().toISOString();
type Patch = Database['public']['Tables']['drive_backup_archives']['Update'];

/** drive_backup_archives + drive_backup_objects with the service role (docs/45 §5). */
@Injectable()
export class DriveBackupRepo implements BackupStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  async abandon(folderId: string): Promise<void> {
    const { error } = await this.db
      .from('drive_backup_archives')
      .update({ status: 'failed', error: 'interrupted', finished_at: now() })
      .eq('folder_id', folderId)
      .eq('status', 'uploading');
    if (error) throw fail('abandon', error);
  }

  async archives(folderId: string): Promise<ArchiveRow[]> {
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .select(ARCHIVE_COLUMNS)
      .eq('folder_id', folderId)
      .neq('status', 'trashed')
      .order('started_at');
    if (error) throw fail('archives read', error);
    return archiveRowSchema.array().parse(data);
  }

  /** Archive by archive, oldest first, page by page: a later ETag replaces an earlier one. */
  async covered(archives: readonly ArchiveRow[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const ordered = [...archives].sort((a, b) => a.started_at.localeCompare(b.started_at));
    for (const a of ordered) {
      for (let from = 0, more = true; more; from += PAGE) {
        const page = await this.objectsPage(a.id, from);
        page.forEach((o) => out.set(objectId(o), o.etag));
        more = page.length === PAGE;
      }
    }
    return out;
  }

  private async objectsPage(archiveId: string, from: number) {
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

  async start(input: NewArchive): Promise<string> {
    const { folderId: folder_id, kind, label, part, name } = input;
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .insert({ folder_id, kind, label, part, name })
      .select('id')
      .single();
    if (error) throw fail('archive start', error);
    return data.id;
  }

  /** The objects first, then `done` with the file id: a crash between leaves it uploading. */
  async finish(input: FinishedArchive): Promise<void> {
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
    const done = {
      status: 'done',
      drive_file_id: input.fileId,
      objects: rows.length,
      skipped: input.skipped,
      bytes_raw: input.rawBytes,
      bytes_compressed: input.compressedBytes,
    };
    await this.patch([input.id], { ...done, finished_at: now() });
  }

  fail(input: { id: string; error: string }): Promise<void> {
    return this.patch([input.id], { status: 'failed', error: input.error, finished_at: now() });
  }

  seal(id: string): Promise<void> {
    return this.patch([id], { sealed: true });
  }

  async trashed(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.patch(ids, { status: 'trashed' });
    const { error } = await this.db
      .from('drive_backup_objects')
      .delete()
      .in('archive_id', [...ids]);
    if (error) throw fail('objects delete', error);
  }

  private async patch(ids: readonly string[], values: Patch): Promise<void> {
    const { error } = await this.db
      .from('drive_backup_archives')
      .update(values)
      .in('id', [...ids]);
    if (error) throw fail('archive write', error);
  }
}
