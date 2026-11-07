import { z } from 'zod';
import { pairs } from '@/scripts/storage-move/args';

// The command line of minio-drive-restore (docs/45 §5): a dry run unless --apply; objects MinIO
// already holds are kept unless --overwrite. Nothing else is accepted.

const flag = z.literal(true).optional();
const Args = z
  .object({
    to: z.iso.date({ message: '--to YYYY-MM-DD: the day to restore to' }),
    apply: flag,
    overwrite: flag,
  })
  .strict();

export interface RestoreArgs {
  to: string;
  apply: boolean;
  overwrite: boolean;
}

export function parseRestoreArgs(argv: readonly string[]): RestoreArgs {
  const a = Args.parse(pairs(argv));
  return { to: a.to, apply: a.apply === true, overwrite: a.overwrite === true };
}
