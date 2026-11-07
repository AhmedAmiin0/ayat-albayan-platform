import { Readable } from 'node:stream';
import { zstdDecompressSync } from 'node:zlib';
import { BUCKETS } from '@/common/storage/storage.paths';
import { readTar } from '@/modules/platform/drive-backup/archive/tar-read';
import { FakeDrive } from '@/modules/platform/drive-backup/drive/drive-backup.fakes';
import { DEFAULT_CAPS, type Caps } from '@/modules/platform/drive-backup/plan/parts';
import { FakeMinio } from '@/modules/platform/drive-backup/source/backup-source.fakes';
import { runBackup } from './backup-run';
import { MemoryStore } from './backup-store.fakes';

// One MinIO, one Drive folder, one bookkeeping store, and a night runner, for the run tests.

export const B = BUCKETS;

export async function setup(caps: Caps = DEFAULT_CAPS) {
  const drive = new FakeDrive();
  const minio = new FakeMinio();
  const store = new MemoryStore();
  const folderId = await drive.createFolder('backup');
  const buckets = [B.reports, B.receipts, B.avatars];
  const deps = { store, api: drive, source: minio, buckets, caps, wait: () => Promise.resolve() };
  /** Runs the backup of the night of `day` (01:00 UTC). */
  const night = (day: string) => {
    const now = new Date(`${day}T01:00:00Z`);
    store.today = now;
    return runBackup(deps, { folderId, now });
  };
  return { drive, minio, store, folderId, deps, night };
}

export interface Entry {
  path: string;
  records: Readonly<Record<string, string>>;
  text: string;
}

/** A Drive archive's entries (decompressed, read back with the restore's tar reader). */
export async function contents(drive: FakeDrive, fileId: string): Promise<Entry[]> {
  const bytes = zstdDecompressSync(drive.files.get(fileId)?.bytes ?? Buffer.alloc(0));
  const out: Entry[] = [];
  for await (const e of readTar(Readable.from([bytes]))) {
    const parts: Buffer[] = [];
    for await (const c of e.body) parts.push(c);
    out.push({ path: e.path, records: e.records, text: Buffer.concat(parts).toString('utf8') });
  }
  return out;
}

/** The archives in the folder by name (not trashed). */
export const names = (drive: FakeDrive, folderId: string): string[] =>
  drive.live(folderId).map((f) => f.meta.name);

export const fileNamed = (drive: FakeDrive, folderId: string, name: string): string =>
  drive.live(folderId).find((f) => f.meta.name === name)?.meta.id ?? '';
