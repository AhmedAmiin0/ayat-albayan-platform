import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdDecompress } from 'node:zlib';
import { z } from 'zod';
import { BUCKETS } from '@/common/storage/storage.paths';
import { readTar, type TarEntry } from '@/modules/platform/drive-backup/archive/tar-read';
import type {
  BackupFile,
  DriveBackupApi,
} from '@/modules/platform/drive-backup/drive/drive-backup.port';
import { restoreOrder } from '@/modules/platform/drive-backup/plan/restore-order';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';
import { verified } from './verified';

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
  /** An older copy (or a duplicate) of a key already restored from a newer archive. */
  older: number;
  failed: string[];
}

const objectSchema = z.object({
  'AB.bucket': z.enum(Object.values(BUCKETS)),
  'AB.key': z.string().min(1),
  'AB.contenttype': z.string().default('application/octet-stream'),
  'AB.etag': z.string().default(''),
});

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
  const body = verified(e.body, o['AB.etag']);
  const object = { bucket: o['AB.bucket'], key: o['AB.key'], size: e.size, body };
  const contentType = o['AB.contenttype'];
  const done = await ctx.input.source
    .restore({ ...object, contentType, overwrite: ctx.input.overwrite })
    .catch(() => null);
  if (done) ctx.tally[done] += 1;
  else ctx.tally.failed.push(id);
}

/**
 * One archive: Drive → zstd → tar → MinIO. After the tar's end the rest is drained and the whole
 * pipeline awaited, so zstd's checksum (at the frame's end) fails the restore, never swallowed.
 */
async function applyArchive(ctx: Ctx, file: BackupFile): Promise<void> {
  const download = Readable.from(await ctx.input.api.download(file.id));
  await pipeline(download, createZstdDecompress(), async (plain: AsyncIterable<Buffer>) => {
    const it = plain[Symbol.asyncIterator]();
    const once = { [Symbol.asyncIterator]: () => it };
    for await (const e of readTar(once)) {
      if (e.path !== 'manifest.json') await putOne(ctx, e);
    }
    let tail = 0;
    for await (const rest of once) tail += rest.length;
    return tail;
  });
}

/**
 * Restores MinIO to the end of day `to` (docs/45 §5): every archive uploaded by then, newest
 * first, so the newest copy of each key wins and a duplicate is only counted. Dry run by default.
 */
export async function restore(input: RestoreInput) {
  const order = restoreOrder(await input.api.list(input.folderId), input.to);
  const archives = order.map((f) => ({ name: f.name, bytes: f.size }));
  if (!input.apply) return { dryRun: true, to: input.to, archives };
  const ctx: Ctx = { input, tally: { put: 0, kept: 0, older: 0, failed: [] }, seen: new Set() };
  for (const file of order) await applyArchive(ctx, file);
  return { dryRun: false, to: input.to, archives, ...ctx.tally };
}
