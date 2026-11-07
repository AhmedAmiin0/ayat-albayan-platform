import { z } from 'zod';
import type { BackupFile } from '@/modules/platform/drive-backup/drive/drive-backup.port';
import { ARCHIVE_KINDS } from './archive.types';

// Which Drive archives restore MinIO to a day (docs/45 §5), read from the files' own
// appProperties: the restore needs Drive only, not the database.

const propsSchema = z.object({
  ab_backup: z.literal('minio'),
  kind: z.enum(ARCHIVE_KINDS),
  label: z.string(),
  part: z.coerce.number().int().positive(),
  /** The UTC day the part was uploaded. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sealed: z.literal('1').optional(),
});
type Meta = z.infer<typeof propsSchema> & { file: BackupFile };

const metaOf = (file: BackupFile): Meta[] => {
  const p = propsSchema.safeParse(file.appProperties);
  return p.success ? [{ ...p.data, file }] : [];
};
const newestFirst = (a: Meta, b: Meta) => b.file.createdTime.localeCompare(a.file.createdTime);

export class NoFullBackup extends Error {
  constructor() {
    super('no_full_backup');
  }
}

/**
 * The archives to apply, NEWEST FIRST (the first copy of a key met wins): the incrementals after
 * the last full sealed on or before `to`, then that full's parts, last part first.
 */
export function restoreChain(files: readonly BackupFile[], to: string): BackupFile[] {
  const metas = files.flatMap(metaOf).filter((m) => m.day <= to);
  const seal = metas.filter((m) => m.kind === 'full' && m.sealed).sort(newestFirst)[0];
  if (!seal) throw new NoFullBackup();
  const full = metas.filter((m) => m.kind === 'full' && m.label === seal.label);
  const after = (m: Meta) => m.kind === 'incr' && m.file.createdTime > seal.file.createdTime;
  const incr = metas.filter(after).sort(newestFirst);
  return [...incr, ...full.sort((a, b) => b.part - a.part)].map((m) => m.file);
}
