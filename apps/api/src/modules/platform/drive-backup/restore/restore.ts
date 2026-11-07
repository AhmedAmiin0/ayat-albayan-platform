import { Readable } from 'node:stream';
import { pipeline } from 'node:stream';
import { createZstdDecompress } from 'node:zlib';
import { z } from 'zod';
import { BUCKETS } from '@/common/storage/storage.paths';
import { readTar, type TarEntry } from '@/modules/platform/drive-backup/archive/tar-read';
import type {
  BackupFile,
  DriveBackupApi,
} from '@/modules/platform/drive-backup/drive/drive-backup.port';
import { restoreChain } from '@/modules/platform/drive-backup/plan/restore-chain';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';

interface RestoreInput {
  api: DriveBackupApi;
  source: BackupSource;
  folderId: string;
  to: string;
  apply: boolean;
  overwrite: boolean;
}

interface Tally {
  put: number;
  kept: number;
  /** An older copy of a key already restored from a newer archive. */
  older: number;
  failed: string[];
}

const objectSchema = z.object({
  'AB.bucket': z.enum(Object.values(BUCKETS)),
  'AB.key': z.string().min(1),
  'AB.contenttype': z.string().default('application/octet-stream'),
});

/** The archive's plain tar: Drive → zstd (its checksum fails a damaged file) → bytes. */
async function entries(api: DriveBackupApi, file: BackupFile): Promise<AsyncIterable<TarEntry>> {
  const zst = createZstdDecompress();
  const plain = pipeline(Readable.from(await api.download(file.id)), zst, () => undefined);
  return readTar(plain);
}

interface Ctx {
  input: RestoreInput;
  tally: Tally;
  seen: Set<string>;
}

async function putOne(ctx: Ctx, e: TarEntry): Promise<void> {
  const o = objectSchema.parse(e.records);
  const id = `${o['AB.bucket']}/${o['AB.key']}`;
  if (ctx.seen.has(id)) return void (ctx.tally.older += 1);
  ctx.seen.add(id);
  const object = { bucket: o['AB.bucket'], key: o['AB.key'], size: e.size, body: e.body };
  const contentType = o['AB.contenttype'];
  const done = await ctx.input.source
    .restore({ ...object, contentType, overwrite: ctx.input.overwrite })
    .catch(() => null);
  if (done) ctx.tally[done] += 1;
  else ctx.tally.failed.push(id);
}

async function applyArchive(ctx: Ctx, file: BackupFile): Promise<void> {
  for await (const e of await entries(ctx.input.api, file)) {
    if (e.path !== 'manifest.json') await putOne(ctx, e);
  }
}

/**
 * Restores MinIO to the end of day `to` (docs/45 §5): the last full sealed by then and the
 * incrementals after it, newest first, so the newest copy of each key wins. Dry run by default.
 */
export async function restore(input: RestoreInput) {
  const chain = restoreChain(await input.api.list(input.folderId), input.to);
  const archives = chain.map((f) => ({ name: f.name, bytes: f.size }));
  if (!input.apply) return { dryRun: true, to: input.to, archives };
  const ctx: Ctx = { input, tally: { put: 0, kept: 0, older: 0, failed: [] }, seen: new Set() };
  for (const file of chain) await applyArchive(ctx, file);
  return { dryRun: false, to: input.to, archives, ...ctx.tally };
}
