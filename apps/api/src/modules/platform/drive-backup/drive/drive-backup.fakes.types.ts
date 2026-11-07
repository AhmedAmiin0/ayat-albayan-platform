import type * as P from './drive-backup.port';

// What FakeDrive (drive-backup.fakes.ts) holds: files and resumable sessions; its delete checks.

export interface Stored {
  meta: P.BackupFile;
  parentId: string;
  mimeType: string;
  bytes: Buffer;
  trashed: boolean;
}
export interface Session {
  target: P.UploadTarget;
  chunks: Buffer[];
  committed: number;
  fileId: string | null;
}

type Files = ReadonlyMap<string, Stored>;

/** The backup's own file (marked, in that folder), trashed or not. */
export function ownFile(files: Files, input: P.RemoveInput): Stored | undefined {
  const f = files.get(input.fileId);
  const own = f?.meta.appProperties.ab_backup === 'minio' && f.parentId === input.folderId;
  return own ? f : undefined;
}

/** Like drive-remove.ts: why a file is left alone (gone, foreign, kept in the trash); null: not. */
export function leftAlone(files: Files, input: P.RemoveInput): P.Removed | null {
  const f = ownFile(files, input);
  if (!f) return files.has(input.fileId) ? 'foreign' : 'gone';
  return f.trashed && input.trashedToo !== true ? 'kept' : null;
}
