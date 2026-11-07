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
  /** Aborts the pipeline: the MinIO read and the tar/zstd streams are destroyed (job deadline). */
  signal?: AbortSignal;
  /** The Drive file id the moment it exists: kept even when the pipeline rejects after it. */
  onFile?: (fileId: string) => void;
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
  const { api, target, wait, signal, onFile } = input;
  const extra = { ...(wait && { wait }), ...(signal && { signal }), ...(onFile && { onFile }) };
  const upload = async (compressed: AsyncIterable<Buffer>) => {
    up = await uploadStream({ api, target, source: compressed, ...extra });
  };
  const options = signal ? { signal } : {};
  await pipeline(tar, createZstdCompress({ params }), upload, options);
  return { fileId: up.fileId, compressedBytes: up.bytes, report };
}
