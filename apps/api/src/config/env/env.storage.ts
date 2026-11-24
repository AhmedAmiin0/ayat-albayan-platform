import {
  minioAccessKey,
  minioBucketPrefix,
  minioPublicUrl,
  minioRegion,
  minioUrl,
  STORAGE_DRIVERS,
  type StorageDriver,
} from '@ab/catalog';
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
  /**
   * The LiveKit egress's own MinIO user, put-only on <prefix>recordings/* (docs/45 §1a): env
   * only (never the DB, never returned). Unset = the egress gets the app key, with a boot warning.
   */
  MINIO_EGRESS_ACCESS_KEY: opt(minioAccessKey),
  MINIO_EGRESS_SECRET_KEY: optionalSecret,
  /** Lesson and meeting recordings into MinIO: its own switch, off by default (docs/45 §1). */
  MINIO_RECORDINGS: z.preprocess(blankIsUnset, z.stringbool().default(false)),
  /** A nightly compressed copy of the MinIO buckets on Google Drive: off by default (docs/45). */
  MINIO_DRIVE_BACKUP: z.preprocess(blankIsUnset, z.stringbool().default(false)),
};

const minioSchema = z.object({
  MINIO_ENDPOINT: minioUrl,
  MINIO_PUBLIC_URL: minioPublicUrl,
  MINIO_REGION: minioRegion.default('us-east-1'),
  MINIO_BUCKET_PREFIX: minioBucketPrefix.default(''),
  MINIO_ACCESS_KEY: minioAccessKey,
  MINIO_SECRET_KEY: z.string().min(1),
});

const egressSchema = z.object({
  MINIO_EGRESS_ACCESS_KEY: minioAccessKey,
  MINIO_EGRESS_SECRET_KEY: z.string().min(1),
});

/** An S3 key pair. */
export interface S3Keys {
  accessKey: string;
  secretKey: string;
}

/** A MinIO server the API can talk to (internal endpoint) and sign for (public URL). */
export interface MinioEnv extends S3Keys {
  endpoint: string;
  publicUrl: string;
  region: string;
  bucketPrefix: string;
}

export interface StorageEnv {
  driver: StorageDriver;
  /** null = not (fully) configured: a MinIO read or write fails loudly, never falls back. */
  minio: MinioEnv | null;
  /** MINIO_RECORDINGS: LiveKit egress writes into MinIO (driver on minio) only when set. */
  recordings: boolean;
  /** MINIO_DRIVE_BACKUP: the worker uploads compressed archives of MinIO to Google Drive. */
  driveBackup: boolean;
  /** MINIO_EGRESS_*: the egress's write-only keys; null (or absent) = the app key (warned). */
  egress?: S3Keys | null;
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
  const flag = z.boolean().catch(false);
  const recordings = flag.parse(env.MINIO_RECORDINGS);
  const driveBackup = flag.parse(env.MINIO_DRIVE_BACKUP);
  return { driver, minio, recordings, driveBackup, egress: egressKeys(env) };
}

function egressKeys(env: StorageSource): S3Keys | null {
  const e = egressSchema.safeParse(env).data;
  return e ? { accessKey: e.MINIO_EGRESS_ACCESS_KEY, secretKey: e.MINIO_EGRESS_SECRET_KEY } : null;
}

/** The boot warning while MinIO is set up but the egress still gets the app's full key. */
export function egressKeyWarning(s: StorageEnv): string | null {
  const appKeyFallback = s.minio !== null && !s.egress;
  return appKeyFallback
    ? 'MINIO_EGRESS_ACCESS_KEY / MINIO_EGRESS_SECRET_KEY unset: recordings use the app key'
    : null;
}
