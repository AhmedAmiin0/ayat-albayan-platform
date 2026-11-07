import type { Bucket } from '@/common/storage/storage.paths';

// What the Drive backup reads from MinIO and what the restore writes back (docs/45 §5). The real
// adapter is minio-source.ts (S3 API, the app user's keys); tests use backup-source.fakes.ts.

export interface ListedObject {
  bucket: Bucket;
  key: string;
  /** MinIO's ETag without quotes: changes when the object's bytes change. */
  etag: string;
  size: number;
}

export interface OpenedObject {
  size: number;
  etag: string;
  contentType: string;
  body: AsyncIterable<Uint8Array>;
}

export interface RestoreObject {
  bucket: Bucket;
  key: string;
  size: number;
  contentType: string;
  body: AsyncIterable<Uint8Array>;
  /** false: an object MinIO already holds is kept (If-None-Match: *). */
  overwrite: boolean;
}

export interface BackupSource {
  list(bucket: Bucket): AsyncIterable<ListedObject>;
  /** null when the object is gone (deleted since the listing). */
  open(o: { bucket: Bucket; key: string }): Promise<OpenedObject | null>;
  restore(o: RestoreObject): Promise<'put' | 'kept'>;
}
