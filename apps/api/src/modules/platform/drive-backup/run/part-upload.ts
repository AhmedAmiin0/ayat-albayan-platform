import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { constants, createZstdCompress } from 'node:zlib';
import type {
  DriveBackupApi,
  UploadTarget,
} from '@/modules/platform/drive-backup/drive/drive-backup.port';
import { uploadStream } from '@/modules/platform/drive-backup/drive/upload';
import { emptyReport, partBytes, type PartInput, type PartReport } from './part-stream';

/**
 * zstd level 3 (zstd's default: fast, little CPU on a server that also runs the CRM), with a
 * checksum so a damaged download fails the restore instead of restoring bad bytes. Node's own
 * zlib has zstd since 22.15 / 23.8 (the image runs Node 24): no native module, no package.
 */
const ZSTD_LEVEL = 3;

interface PartUpload {
  api: DriveBackupApi;
  target: UploadTarget;
  part: Omit<PartInput, 'report'>;
  wait?: (ms: number) => Promise<unknown>;
}

interface PartResult {
  fileId: string;
  compressedBytes: number;
  report: PartReport;
}

/** MinIO → tar → zstd → Drive, streamed end to end: no archive in memory or on disk. */
export async function uploadPart(input: PartUpload): Promise<PartResult> {
  const report = emptyReport();
  const params = {
    [constants.ZSTD_c_compressionLevel]: ZSTD_LEVEL,
    [constants.ZSTD_c_checksumFlag]: 1,
  };
  const tar = Readable.from(partBytes({ ...input.part, report }));
  let up = { fileId: '', bytes: 0 };
  const wait = input.wait ? { wait: input.wait } : {};
  await pipeline(tar, createZstdCompress({ params }), async (compressed: AsyncIterable<Buffer>) => {
    up = await uploadStream({ api: input.api, target: input.target, source: compressed, ...wait });
  });
  return { fileId: up.fileId, compressedBytes: up.bytes, report };
}
