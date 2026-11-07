import type { StorageService } from '@/common/storage/storage.service';

/** StorageService as RecordingStarter sees it: Supabase keeps new files (RECORDING_S3_*). */
export const SUPABASE_STORAGE = {
  writesTo: () => 'supabase',
  recordsToMinio: () => false,
  egressTarget: () => null,
} as unknown as StorageService;

/** MinIO keeps new recordings (MINIO_RECORDINGS on, docs/45): the row keeps «minio:…». */
export const MINIO_TARGET = {
  endpoint: 'https://files.example.com',
  region: 'us-east-1',
  bucket: 'recordings',
  accessKey: 'ayat-app',
  secret: 'not-a-real-secret',
};
export const MINIO_STORAGE = {
  writesTo: () => 'minio',
  recordsToMinio: () => true,
  egressTarget: () => MINIO_TARGET,
} as unknown as StorageService;

/** The driver on minio, MINIO_RECORDINGS off: new files go to MinIO, recordings do not. */
export const MINIO_NO_RECORDINGS = {
  writesTo: () => 'minio',
  recordsToMinio: () => false,
  egressTarget: () => null,
} as unknown as StorageService;
