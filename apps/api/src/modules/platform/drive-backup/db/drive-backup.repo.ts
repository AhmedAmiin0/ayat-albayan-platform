import type { Database } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type {
  BackupStore,
  FinishedArchive,
  NewArchive,
} from '@/modules/platform/drive-backup/run/backup-store.port';
import { ArchiveReadsRepo } from './archive-reads.repo';
import { fail } from './archive-row.schema';
import { ArchiveObjectsRepo } from './archive-objects.repo';

const now = () => new Date().toISOString();
type Patch = Database['public']['Tables']['drive_backup_archives']['Update'];

/** drive_backup_archives + drive_backup_objects with the service role (docs/45 §5, add-only). */
@Injectable()
export class DriveBackupRepo implements BackupStore {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ArchiveObjectsRepo) private readonly objects: ArchiveObjectsRepo,
    @Inject(ArchiveReadsRepo) private readonly reads: ArchiveReadsRepo,
  ) {}

  async abandon(folderId: string): Promise<void> {
    const { error } = await this.db
      .from('drive_backup_archives')
      .update({ status: 'failed', error: 'interrupted', finished_at: now() })
      .eq('folder_id', folderId)
      .eq('status', 'uploading');
    if (error) throw fail('abandon', error);
  }

  covered(folderId: string): Promise<Set<string>> {
    return this.objects.covered(folderId);
  }

  lastPart(input: Pick<NewArchive, 'folderId' | 'label'>): Promise<number> {
    return this.reads.lastPart(input);
  }

  async start(input: NewArchive): Promise<string> {
    const { folderId: folder_id, label, part, name } = input;
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .insert({ folder_id, label, part, name })
      .select('id')
      .single();
    if (error) throw fail('archive start', error);
    return data.id;
  }

  uploaded(input: { id: string; fileId: string }): Promise<void> {
    return this.own(input.id, { drive_file_id: input.fileId });
  }

  /** The objects first, then `done`: a crash between leaves it uploading (its file id is kept). */
  async finish(input: FinishedArchive): Promise<void> {
    await this.objects.write(input);
    const done = {
      status: 'done',
      drive_file_id: input.fileId,
      objects: input.entries.length,
      skipped: input.skipped,
      bytes_raw: input.rawBytes,
      bytes_compressed: input.compressedBytes,
    };
    await this.own(input.id, { ...done, finished_at: now() });
  }

  fail(input: { id: string; error: string; fileId?: string }): Promise<void> {
    const file = input.fileId === undefined ? {} : { drive_file_id: input.fileId };
    return this.own(input.id, {
      status: 'failed',
      error: input.error,
      finished_at: now(),
      ...file,
    });
  }

  /** This run's row only: still `uploading`; zero rows changed is an error (docs/45 §5). */
  private async own(id: string, values: Patch): Promise<void> {
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .update(values)
      .eq('id', id)
      .eq('status', 'uploading')
      .select('id');
    if (error) throw fail('archive write', error);
    if (data.length !== 1) throw new Error('drive backup archive write failed: not uploading');
  }
}
