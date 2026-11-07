import { Readable } from 'node:stream';
import { GoogleApiError } from '@/modules/platform/google-sync';
import type * as P from './drive-backup.port';
import { BACKUP_MARK, FOLDER_MIME } from './drive-files.schema';

// An in-memory Drive for the backup's tests: folders, resumable sessions, files, deletes. Never
// Google. Obviously fake ids and an example.test account.

interface Stored {
  meta: P.BackupFile;
  parentId: string;
  mimeType: string;
  bytes: Buffer;
  trashed: boolean;
}
interface Session {
  target: P.UploadTarget;
  chunks: Buffer[];
  committed: number;
  fileId: string | null;
}

const GB = 1024 ** 3;
const T0 = Date.UTC(2026, 10, 1);

export class FakeDrive implements P.DriveBackupApi {
  readonly files = new Map<string, Stored>();
  readonly sessions = new Map<string, Session>();
  readonly log: string[] = [];
  /** Ids deleted for good (remove). */
  readonly deleted: string[] = [];
  /** The next call of that method throws this error once. */
  readonly failNext = new Map<string, Error>();
  quotaAnswer: P.DriveQuota = { limit: 15 * GB, usage: GB, email: 'academy@example.test' };
  private seq = 0;

  private call(method: string): void {
    this.log.push(method);
    const err = this.failNext.get(method);
    this.failNext.delete(method);
    if (err) throw err;
  }

  private add(input: Omit<Stored, 'meta' | 'trashed'> & { name: string; props: object }): string {
    this.seq += 1;
    const id = `file_${this.seq}`;
    const createdTime = new Date(T0 + this.seq * 1000).toISOString();
    const appProperties = { ...input.props } as Record<string, string>;
    const meta = { id, name: input.name, size: input.bytes.length, createdTime, appProperties };
    this.files.set(id, { ...input, meta, trashed: false });
    return id;
  }

  /** Not trashed, in that folder. */
  live(folderId: string): Stored[] {
    return [...this.files.values()].filter((f) => f.parentId === folderId && !f.trashed);
  }

  quota() {
    this.call('quota');
    return Promise.resolve(this.quotaAnswer);
  }

  folder(id: string) {
    this.call('folder');
    const f = this.files.get(id);
    const own = f && !f.trashed && f.meta.appProperties.ab_backup === 'minio';
    return Promise.resolve(own ? f.meta : null);
  }

  findFolders(name: string) {
    this.call('findFolders');
    const own = (f: Stored) => f.mimeType === FOLDER_MIME && f.meta.name === name;
    return Promise.resolve(
      this.live('root')
        .filter(own)
        .map((f) => f.meta),
    );
  }

  createFolder(name: string) {
    this.call('createFolder');
    const input = { name, parentId: 'root', mimeType: FOLDER_MIME, bytes: Buffer.alloc(0) };
    return Promise.resolve(this.add({ ...input, props: BACKUP_MARK }));
  }

  list(folderId: string) {
    this.call('list');
    return Promise.resolve(this.live(folderId).map((f) => f.meta));
  }

  startUpload(target: P.UploadTarget) {
    this.call('startUpload');
    const session = `https://upload.example.test/session/${this.sessions.size + 1}`;
    this.sessions.set(session, { target, chunks: [], committed: 0, fileId: null });
    return Promise.resolve(session);
  }

  putChunk(input: P.ChunkInput): Promise<P.ChunkResult> {
    this.call('putChunk');
    const s = this.sessions.get(input.session);
    if (s?.committed !== input.offset) throw new GoogleApiError(400, 'badContentRange');
    s.chunks.push(input.bytes);
    s.committed += input.bytes.length;
    if (input.total === null) return Promise.resolve({ committed: s.committed, fileId: null });
    const { name, parentId, appProperties } = s.target;
    const bytes = Buffer.concat(s.chunks);
    const mimeType = 'application/zstd';
    s.fileId = this.add({ name, parentId, mimeType, bytes, props: appProperties });
    return Promise.resolve({ committed: 0, fileId: s.fileId });
  }

  progress(session: string): Promise<P.ChunkResult> {
    this.call('progress');
    const s = this.sessions.get(session);
    return Promise.resolve({ committed: s?.committed ?? 0, fileId: s?.fileId ?? null });
  }

  setProperties(input: { fileId: string; appProperties: Record<string, string> }) {
    this.call('setProperties');
    const f = this.found(input.fileId);
    f.meta = { ...f.meta, appProperties: { ...f.meta.appProperties, ...input.appProperties } };
    return Promise.resolve();
  }

  /** Like drive-remove.ts: only a marked file in that folder; a missing one is gone. */
  remove(input: P.RemoveInput): Promise<P.Removed> {
    this.call('remove');
    const f = this.files.get(input.fileId);
    const own = f?.meta.appProperties.ab_backup === 'minio' && f.parentId === input.folderId;
    const outcome: P.Removed = f ? 'foreign' : 'gone';
    if (!own) return Promise.resolve(outcome);
    this.files.delete(input.fileId);
    this.deleted.push(input.fileId);
    return Promise.resolve('deleted');
  }

  download(fileId: string) {
    this.call('download');
    return Promise.resolve(Readable.from([this.found(fileId).bytes]));
  }

  private found(id: string): Stored {
    const f = this.files.get(id);
    if (!f) throw new GoogleApiError(404, 'notFound');
    return f;
  }
}
