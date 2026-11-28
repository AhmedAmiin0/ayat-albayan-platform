import { instant, localDate } from '@ab/core';
import { z } from 'zod';

const count = z.int().nonnegative();
const bytes = z.number().nonnegative();

/** Why an object was not backed up tonight (it is tried again every night). */
export const SKIP_WHYS = ['too_large', 'read_failed', 'changed', 'upload_failed'] as const;
export const skipWhySchema = z.enum(SKIP_WHYS);
export type SkipWhy = z.infer<typeof skipWhySchema>;

/** A skipped object, named in the admin status and the alert; `id` is `bucket/key`. */
export const backupSkippedItemSchema = z.object({
  id: z.string(),
  size: bytes,
  reason: skipWhySchema,
});
export type BackupSkippedItem = z.infer<typeof backupSkippedItemSchema>;

/** The latest night that uploaded, all its parts summed. */
const lastArchiveSchema = z.object({
  label: localDate,
  finished_at: instant.nullable(),
  objects: count,
  skipped: count,
  bytes_raw: bytes,
  bytes_compressed: bytes,
});

/** Drive's quota at the last check; a null limit is an account without one. */
const quotaSchema = z.object({
  limit: bytes.nullable(),
  usage: bytes,
  free: bytes.nullable(),
  at: instant,
});

/** The Drive backup's status line (docs/45 §5). */
export const backupStatusViewSchema = z.object({
  enabled: z.boolean(),
  ready: z.object({ minio: z.boolean(), google: z.boolean() }),
  last: lastArchiveSchema.nullable(),
  last_run_at: instant.nullable(),
  last_error: z.string().nullable(),
  quota: quotaSchema.nullable(),
  low_quota: z.boolean(),
  /** The last night's skipped objects: how many, and the first ones named (retried nightly). */
  skipped: z.object({ count, items: z.array(backupSkippedItemSchema) }),
  /** Objects the last night could not send: Drive's free space under the 2 GB reserve. */
  waiting: count,
});
export type BackupStatusView = z.infer<typeof backupStatusViewSchema>;
