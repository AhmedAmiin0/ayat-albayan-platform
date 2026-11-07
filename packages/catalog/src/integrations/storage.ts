import { z } from 'zod';
import { evolutionBaseAllowed } from './evolution.js';

// Object storage in «التكاملات» (owner 2026-11-06, docs/45): Supabase Storage keeps today's
// files; MinIO (S3 API, self-hosted) keeps every new one once an admin switches STORAGE_DRIVER.

/** Where new files are written. Reads follow each stored path's marker (@ab/shared stored-path). */
export const STORAGE_DRIVERS = ['supabase', 'minio'] as const;
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];

/** The plain keys (integration_config); MINIO_SECRET_KEY is a Vault secret (keys.ts). */
export const STORAGE_PLAIN_KEYS = [
  'STORAGE_DRIVER',
  'MINIO_ENDPOINT',
  'MINIO_PUBLIC_URL',
  'MINIO_REGION',
  'MINIO_BUCKET_PREFIX',
  'MINIO_ACCESS_KEY',
  'MINIO_RECORDINGS',
  'MINIO_DRIVE_BACKUP',
] as const;

/** The docker services an http MinIO endpoint may name (deploy/staging: the stack's MinIO). */
export const MINIO_INTERNAL_HOSTS: readonly string[] = ['ayat-minio'];

/**
 * An S3 endpoint: http(s), a host and port only (path-style buckets go after it). SSRF guard, the
 * Evolution base's rules (evolution.ts): http only to the VPS itself or a listed docker service,
 * https only to a public host name; never an IP literal (no internal address or port scan).
 */
export const minioUrl = z
  .string()
  .max(200)
  .regex(/^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?\/?$/, 'minio_url')
  .refine((raw) => evolutionBaseAllowed(raw.replace(/\/$/, ''), MINIO_INTERNAL_HOSTS), 'minio_url');

const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/;

/** Signed URLs leave the server (browsers, phones, WhatsApp): https, or http on localhost. */
export const minioPublicUrl = minioUrl.refine(
  (raw) => raw.startsWith('https://') || LOCAL.test(raw),
  'minio_public_https',
);

/** An S3 region name (MinIO's default us-east-1). */
export const minioRegion = z.string().regex(/^[a-z0-9-]{2,40}$/);

/** Prepended to every bucket name (S3 naming: lower case, digits, dots, dashes). */
export const minioBucketPrefix = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,30}$/);

/** A MinIO access key: 3..128 printable characters, no spaces. */
export const minioAccessKey = z.string().regex(/^[A-Za-z0-9._@+=-]{3,128}$/);

/** The value checks of the storage group's plain keys (checks.ts INTEGRATION_VALUE_CHECKS). */
export const STORAGE_VALUE_CHECKS: Record<(typeof STORAGE_PLAIN_KEYS)[number], z.ZodType> = {
  STORAGE_DRIVER: z.enum(STORAGE_DRIVERS),
  MINIO_ENDPOINT: minioUrl,
  MINIO_PUBLIC_URL: minioPublicUrl,
  MINIO_REGION: minioRegion,
  MINIO_BUCKET_PREFIX: minioBucketPrefix,
  MINIO_ACCESS_KEY: minioAccessKey,
  MINIO_RECORDINGS: z.enum(['false', 'true']),
  MINIO_DRIVE_BACKUP: z.enum(['false', 'true']),
};
