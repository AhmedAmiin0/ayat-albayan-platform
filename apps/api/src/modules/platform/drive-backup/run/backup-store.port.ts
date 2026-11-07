import type { Bucket } from '@/common/storage/storage.paths';
import type { DriveBackupApi } from '@/modules/platform/drive-backup/drive/drive-backup.port';
import type {
  ArchiveKind,
  ArchiveRow,
  ArchiveStatus,
} from '@/modules/platform/drive-backup/plan/archive.types';
import type { Caps } from '@/modules/platform/drive-backup/plan/parts';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { PartEntry } from './part-stream';

// The backup's bookkeeping (tables drive_backup_*; db/drive-backup.repo.ts), as the run needs it.

export interface NewArchive {
  folderId: string;
  kind: ArchiveKind;
  label: string;
  part: number;
  name: string;
}

export interface FinishedArchive {
  id: string;
  fileId: string;
  rawBytes: number;
  compressedBytes: number;
  skipped: number;
  /** The objects (with ETags) the file holds: what later runs count as covered. */
  entries: readonly PartEntry[];
}

export interface BackupStore {
  /** Rows still `uploading` (a crash mid-upload) become `failed`: their objects are not covered. */
  abandon(folderId: string): Promise<void>;
  /** The folder's archives, every status but trashed, oldest first. */
  archives(folderId: string): Promise<ArchiveRow[]>;
  /** `bucket/key` → ETag held by these archives (later archives win). */
  covered(archives: readonly ArchiveRow[]): Promise<Map<string, string>>;
  /** The highest part number of that archive over EVERY row, trashed ones included; 0: none. */
  lastPart(input: Pick<NewArchive, 'folderId' | 'kind' | 'label'>): Promise<number>;
  /** A row's status now (null: no such row): what a write whose answer was lost really did. */
  status(id: string): Promise<ArchiveStatus | null>;
  start(input: NewArchive): Promise<string>;
  // uploaded / finish / fail change a row only while it is `uploading` (this run's): zero rows
  // changed (another run abandoned it) is an error, never a silent success.
  /** The Drive file id, as soon as the upload returns (before the objects are written). */
  uploaded(input: { id: string; fileId: string }): Promise<void>;
  finish(input: FinishedArchive): Promise<void>;
  /** `failed`, with the Drive file id when the file exists (the next run deletes that file). */
  fail(input: { id: string; error: string; fileId?: string }): Promise<void>;
  seal(id: string): Promise<void>;
  /** Status `trashed`: the file is deleted from Drive (or was gone); its objects are dropped. */
  trashed(ids: readonly string[]): Promise<void>;
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
