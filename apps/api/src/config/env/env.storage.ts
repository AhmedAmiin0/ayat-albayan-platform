import {
  minioAccessKey,
  minioBucketPrefix,
  minioPublicUrl,
  minioRegion,
  minioUrl,
  STORAGE_DRIVERS,
  type StorageDriver,
} from '@ab/shared';
import { z } from 'zod';
import { blankIsUnset, optionalSecret } from './env.blank';

// Object storage (docs/45): which store keeps new files, and the MinIO server. Every key may come
// from «التكاملات» (DB + Vault) through the integration overlay; env only bootstraps.

const opt = <T extends z.ZodType>(t: T) => z.preprocess(blankIsUnset, t.optional());

export const STORAGE_SHAPE = {
  /** supabase (default) until an admin switches to minio: the cut-over. */
  STORAGE_DRIVER: z.preprocess(blankIsUnset, z.enum(STORAGE_DRIVERS).default('supabase')),
  MINIO_ENDPOINT: opt(minioUrl),
  MINIO_PUBLIC_URL: opt(minioPublicUrl),
  MINIO_REGION: opt(minioRegion),
  MINIO_BUCKET_PREFIX: opt(minioBucketPrefix),
  MINIO_ACCESS_KEY: opt(minioAccessKey),
  MINIO_SECRET_KEY: optionalSecret,
  /** Lesson and meeting recordings into MinIO: its own switch, off by default (docs/45 §1). */
  MINIO_RECORDINGS: z.preprocess(blankIsUnset, z.stringbool().default(false)),
};

const minioSchema = z.object({
  MINIO_ENDPOINT: minioUrl,
  MINIO_PUBLIC_URL: minioPublicUrl,
  MINIO_REGION: minioRegion.default('us-east-1'),
  MINIO_BUCKET_PREFIX: minioBucketPrefix.default(''),
  MINIO_ACCESS_KEY: minioAccessKey,
  MINIO_SECRET_KEY: z.string().min(1),
});

/** A MinIO server the API can talk to (internal endpoint) and sign for (public URL). */
export interface MinioEnv {
  endpoint: string;
  publicUrl: string;
  region: string;
  bucketPrefix: string;
  accessKey: string;
  secretKey: string;
}

export interface StorageEnv {
  driver: StorageDriver;
  /** null = not (fully) configured: a MinIO read or write fails loudly, never falls back. */
  minio: MinioEnv | null;
  /** MINIO_RECORDINGS: LiveKit egress writes into MinIO (driver on minio) only when set. */
  recordings: boolean;
}

type StorageSource = Partial<Record<keyof typeof STORAGE_SHAPE, unknown>>;

const trim = (url: string): string => url.replace(/\/+$/, '');

/** The storage config of a loaded env (loadEnv()). Never throws. */
export function storageEnv(env: StorageSource): StorageEnv {
  const driver = z.enum(STORAGE_DRIVERS).catch('supabase').parse(env.STORAGE_DRIVER);
  const m = minioSchema.safeParse(env).data;
  const minio = m
    ? {
        endpoint: trim(m.MINIO_ENDPOINT),
        publicUrl: trim(m.MINIO_PUBLIC_URL),
        region: m.MINIO_REGION,
        bucketPrefix: m.MINIO_BUCKET_PREFIX,
        accessKey: m.MINIO_ACCESS_KEY,
        secretKey: m.MINIO_SECRET_KEY,
      }
    : null;
  const recordings = z.boolean().catch(false).parse(env.MINIO_RECORDINGS);
  return { driver, minio, recordings };
}
