import type { MinioEnv, StorageEnv } from '@/config/env/env.storage';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';

// The Drive calls of the MinIO backup (docs/45 §5), on the academy's existing Google connection.
// The real adapter is drive-backup.http.ts; every test uses drive-backup.fakes.ts. Failures throw
// GoogleApiError (status + Google's reason, never a token or a URL).

export interface DriveQuota {
  /** null: no limit (a Workspace pool). */
  limit: number | null;
  usage: number;
  /** The account the token belongs to (Drive's own answer): the folder is kept per account. */
  email: string;
}

export interface BackupFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  appProperties: Readonly<Record<string, string>>;
}

export interface UploadTarget {
  name: string;
  parentId: string;
  appProperties: Readonly<Record<string, string>>;
}

/** After a chunk: the bytes Drive holds (while fileId is null), the file once the last is in. */
export interface ChunkResult {
  committed: number;
  fileId: string | null;
}

export interface ChunkInput {
  session: string;
  offset: number;
  bytes: Buffer;
  /** The upload's total size on its last chunk; null before. */
  total: number | null;
}

export interface RemoveInput {
  fileId: string;
  folderId: string;
  /** Retention only: a file a person moved to Drive's trash is deleted too (else it is kept). */
  trashedToo?: boolean;
}
/**
 * gone: already not on Drive (404); foreign: not the backup's own archive, left alone; kept: in
 * Drive's trash (a person may restore it for 30 days), left alone outside retention.
 */
export type Removed = 'deleted' | 'gone' | 'foreign' | 'kept';

export interface DriveBackupApi {
  quota(): Promise<DriveQuota>;
  /** The folder if it exists, is not trashed and is the backup's own (appProperties). */
  folder(id: string): Promise<BackupFile | null>;
  /** The backup's own folders of that name in My Drive's root. */
  findFolders(name: string): Promise<BackupFile[]>;
  createFolder(name: string): Promise<string>;
  /** The files in a folder (not trashed). */
  list(folderId: string): Promise<BackupFile[]>;
  /**
   * The ids of the files in `folderId` that carry the backup's marker AND `ab_row` = `rowId` (one
   * archive row's upload): how a failed row whose file id was lost finds its file. Nothing else.
   */
  findMarked(input: { folderId: string; rowId: string }): Promise<string[]>;
  /** A resumable upload session (its URL stays in memory only). */
  startUpload(target: UploadTarget): Promise<string>;
  putChunk(input: ChunkInput): Promise<ChunkResult>;
  /** What Drive holds of a session (after a failed chunk). */
  progress(session: string): Promise<ChunkResult>;
  setProperties(input: { fileId: string; appProperties: Record<string, string> }): Promise<void>;
  /**
   * Deletes an archive for good (Drive's trash would keep counting against the shared quota for 30
   * days), but only a file in `folderId` that carries the backup's marker: anything else is left.
   */
  remove(input: RemoveInput): Promise<Removed>;
  /** The backup's own file in `folderId`, not trashed (one GET by id): a part to seal on. */
  present(input: RemoveInput): Promise<boolean>;
  download(fileId: string): Promise<AsyncIterable<Uint8Array>>;
}

/** The outside world: Drive for the connected token (null: no OAuth client), MinIO, config. */
export interface DriveBackupFactory {
  /** `signal` aborts every Drive request of the run (the job's deadline). */
  drive(refreshToken: string, signal?: AbortSignal): DriveBackupApi | null;
  /** `signal` aborts every MinIO read of the run (the job's deadline). */
  source(minio: MinioEnv, signal?: AbortSignal): BackupSource;
  /** The storage config now («التكاملات» overlay or env). */
  config(): StorageEnv;
}
export const DRIVE_BACKUP_FACTORY = Symbol('DRIVE_BACKUP_FACTORY');
