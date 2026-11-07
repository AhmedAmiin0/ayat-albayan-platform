import type { Bucket } from '@/common/storage/storage.paths';
import type { DriveBackupApi } from '@/modules/platform/drive-backup/drive/drive-backup.port';
import type { PartPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import type { Caps } from '@/modules/platform/drive-backup/plan/parts';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { PartEntry } from './part-stream';

// The backup's bookkeeping (tables drive_backup_*; db/drive-backup.repo.ts), as the run needs it.
// Add-only: rows are added and moved uploading → done | failed; nothing is ever removed.

export type NewArchive = PartPlan & { folderId: string; name: string };

export interface FinishedArchive {
  id: string;
  folderId: string;
  fileId: string;
  rawBytes: number;
  compressedBytes: number;
  skipped: number;
  /** The objects (with ETags) the file holds: recorded, they count as backed up. */
  entries: readonly PartEntry[];
}

export interface BackupStore {
  /** Rows still `uploading` (a crash mid-upload) become `failed`: their objects go again. */
  abandon(folderId: string): Promise<void>;
  /** Every recorded version of the folder, as `versionId` (plan/parts.ts). */
  covered(folderId: string): Promise<Set<string>>;
  /** The highest part number of that night's archives, failed ones included; 0: none. */
  lastPart(input: Pick<NewArchive, 'folderId' | 'label'>): Promise<number>;
  start(input: NewArchive): Promise<string>;
  // uploaded / finish / fail change a row only while it is `uploading` (this run's): zero rows
  // changed (another run abandoned it) is an error, never a silent success.
  /** The Drive file id, as soon as the upload returns (before the objects are written). */
  uploaded(input: { id: string; fileId: string }): Promise<void>;
  /** The objects first (they count as backed up), then the row `done`. */
  finish(input: FinishedArchive): Promise<void>;
  /** `failed`, with the Drive file id when the file exists (an orphan, never deleted). */
  fail(input: { id: string; error: string; fileId?: string }): Promise<void>;
}

/** What one run works with (the job builds it; tests pass fakes). */
export interface RunDeps {
  store: BackupStore;
  api: DriveBackupApi;
  source: BackupSource;
  buckets: readonly Bucket[];
  caps: Caps;
  wait?: (ms: number) => Promise<unknown>;
  /** The job's deadline: aborts the MinIO → Drive pipeline of the part in flight. */
  signal?: AbortSignal;
}
