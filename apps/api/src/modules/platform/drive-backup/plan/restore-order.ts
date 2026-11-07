import { z } from 'zod';
import type { BackupFile } from '@/modules/platform/drive-backup/drive/drive-backup.port';

// Which Drive archives restore MinIO to a day (docs/45 §5), read from the files' own
// appProperties: the restore needs Drive only, not the database. Add-only: every archive counts.

const propsSchema = z.object({
  ab_backup: z.literal('minio'),
  /** The UTC day of the night that uploaded it. */
  label: z.iso.date(),
  part: z.coerce.number().int().positive(),
});
type Meta = z.infer<typeof propsSchema> & { file: BackupFile };

const metaOf = (file: BackupFile): Meta[] => {
  const p = propsSchema.safeParse(file.appProperties);
  return p.success ? [{ ...p.data, file }] : [];
};

/** Newest first: the later night, then the higher part, then the later upload (a duplicate). */
const newestFirst = (a: Meta, b: Meta): number =>
  b.label.localeCompare(a.label) ||
  b.part - a.part ||
  b.file.createdTime.localeCompare(a.file.createdTime);

/**
 * Every archive uploaded on or before `to`, NEWEST FIRST: the restore keeps the first copy of a
 * key it meets, so the newest copy wins and duplicates (a part sent twice) are harmless. This is
 * «apply every archive in name order, the newest copy wins», without writing a key twice.
 */
export const restoreOrder = (files: readonly BackupFile[], to: string): BackupFile[] =>
  files
    .flatMap(metaOf)
    .filter((m) => m.label <= to)
    .sort(newestFirst)
    .map((m) => m.file);
