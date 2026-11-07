import type * as P from './drive-backup.port';

// What FakeDrive (drive-backup.fakes.ts) holds: files and resumable sessions.

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
