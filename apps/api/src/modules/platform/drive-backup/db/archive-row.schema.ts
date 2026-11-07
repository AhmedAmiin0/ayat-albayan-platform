import { z } from 'zod';
import {
  ARCHIVE_KINDS,
  ARCHIVE_STATUSES,
} from '@/modules/platform/drive-backup/plan/archive.types';

/** A drive_backup_archives row as the planner reads it (text columns narrowed, rule 12). */
export const archiveRowSchema = z.object({
  id: z.string(),
  kind: z.enum(ARCHIVE_KINDS),
  label: z.string(),
  part: z.number().int(),
  status: z.enum(ARCHIVE_STATUSES),
  sealed: z.boolean(),
  started_at: z.string(),
  drive_file_id: z.string().nullable(),
});
export const ARCHIVE_COLUMNS = 'id, kind, label, part, status, sealed, started_at, drive_file_id';

/** The status line's view of recent archives. */
export const recentRowSchema = archiveRowSchema.extend({
  objects: z.number(),
  skipped: z.number(),
  bytes_raw: z.number(),
  bytes_compressed: z.number(),
  finished_at: z.string().nullable(),
  error: z.string().nullable(),
});
export type RecentRow = z.infer<typeof recentRowSchema>;
export const RECENT_COLUMNS = `${ARCHIVE_COLUMNS}, objects, skipped, bytes_raw, bytes_compressed, finished_at, error`;

export const fail = (what: string, error: { message: string }) =>
  new Error(`drive backup ${what} failed: ${error.message}`);
