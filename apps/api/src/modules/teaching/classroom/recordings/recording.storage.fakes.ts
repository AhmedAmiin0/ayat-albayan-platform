import type { StorageService } from '@/common/storage/storage.service';

/** StorageService as RecordingStarter sees it: Supabase keeps new files (RECORDING_S3_*). */
export const SUPABASE_STORAGE = {
  writesTo: () => 'supabase',
  egressTarget: () => null,
} as unknown as StorageService;

/** MinIO keeps new files (docs/45): the egress uploads there, the row keeps «minio:…». */
export const MINIO_TARGET = {
  endpoint: 'https://files.example.com',
  region: 'us-east-1',
  bucket: 'recordings',
  accessKey: 'ayat-app',
  secret: 'not-a-real-secret',
};
export const MINIO_STORAGE = {
  writesTo: () => 'minio',
  egressTarget: () => MINIO_TARGET,
} as unknown as StorageService;
