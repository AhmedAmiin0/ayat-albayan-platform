import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { NewArchive } from '@/modules/platform/drive-backup/run/backup-store.port';
import { fail } from './archive-row.schema';

/** Single-row reads of drive_backup_archives with the service role (DriveBackupRepo's). */
@Injectable()
export class ArchiveReadsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The highest part number of that night's archives, failed ones included; 0: none. */
  async lastPart(input: Pick<NewArchive, 'folderId' | 'label'>): Promise<number> {
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .select('part')
      .eq('folder_id', input.folderId)
      .eq('label', input.label)
      .order('part', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw fail('last part read', error);
    return data?.part ?? 0;
  }
}
