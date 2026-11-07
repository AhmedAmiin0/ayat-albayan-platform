import { z } from 'zod';
import { ARCHIVE_STATUSES } from '@/modules/platform/drive-backup/plan/archive.types';

/** The status line's view of recent archives (text columns narrowed, rule 12). */
export const recentRowSchema = z.object({
  label: z.string(),
  part: z.number().int(),
  status: z.enum(ARCHIVE_STATUSES),
  objects: z.number(),
  skipped: z.number(),
  bytes_raw: z.number(),
  bytes_compressed: z.number(),
  finished_at: z.string().nullable(),
});
export type RecentRow = z.infer<typeof recentRowSchema>;
export const RECENT_COLUMNS =
  'label, part, status, objects, skipped, bytes_raw, bytes_compressed, finished_at';

export const fail = (what: string, error: { message: string }) =>
  new Error(`drive backup ${what} failed: ${error.message}`);
