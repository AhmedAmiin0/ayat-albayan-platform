import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import {
  ARCHIVE_STATUSES,
  type ArchiveStatus,
} from '@/modules/platform/drive-backup/plan/archive.types';
import type { NewArchive } from '@/modules/platform/drive-backup/run/backup-store.port';
import { fail } from './archive-row.schema';

const statusSchema = z.object({ status: z.enum(ARCHIVE_STATUSES) });

/** Single-row reads of drive_backup_archives with the service role (DriveBackupRepo's). */
@Injectable()
export class ArchiveReadsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The highest part number of that archive over EVERY row, trashed ones included; 0: none. */
  async lastPart(input: Pick<NewArchive, 'folderId' | 'kind' | 'label'>): Promise<number> {
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .select('part')
      .eq('folder_id', input.folderId)
      .eq('kind', input.kind)
      .eq('label', input.label)
      .order('part', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw fail('last part read', error);
    return data?.part ?? 0;
  }

  /** A row's status now; null: no such row. */
  async status(id: string): Promise<ArchiveStatus | null> {
    const { data, error } = await this.db
      .from('drive_backup_archives')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (error) throw fail('status read', error);
    return data === null ? null : statusSchema.parse(data).status;
  }
}
