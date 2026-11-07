import { z } from 'zod';
import { MOVED_TABLES } from './columns';

// The command line of storage-move (docs/45 §6). A dry run unless --apply; nothing else is
// accepted, so a typo never runs something the operator did not ask for.

const flag = z.literal(true).optional();
const count = (max: number) => z.coerce.number().int().min(1).max(max);

const Args = z
  .object({
    apply: flag,
    'dry-run': flag,
    table: z
      .string()
      .refine((t) => MOVED_TABLES.includes(t), { message: `--table: one of ${MOVED_TABLES.join(', ')}` })
      .optional(),
    limit: count(10_000_000).optional(),
    after: z.guid().optional(),
    batch: count(500).default(100),
    'max-mb': count(256).default(64),
    'pause-ms': z.coerce.number().int().min(0).max(60_000).default(500),
    sample: count(50).default(5),
  })
  .strict()
  .refine((a) => !(a.apply && a['dry-run']), { message: '--apply and --dry-run together' })
  .refine((a) => a.after === undefined || a.table !== undefined, {
    message: '--after resumes one table: name it with --table',
  });

export interface MoveArgs {
  apply: boolean;
  table?: string;
  limit: number;
  after?: string;
  batch: number;
  maxBytes: number;
  pauseMs: number;
  sample: number;
}

const isFlag = (s: string | undefined): boolean => s?.startsWith('--') === true;

/** A word that is not a --flag gets a key no flag has, so .strict() refuses it. */
const keyOf = (word: string): string => (isFlag(word) ? word.slice(2) : `?${word}`);

/** ['--table', 'payments', '--apply'] → { table: 'payments', apply: true }. */
function pairs(argv: readonly string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const next = argv[i + 1];
    const valued = next !== undefined && !isFlag(next);
    out[keyOf(argv[i] ?? '')] = valued ? next : true;
    i += valued ? 1 : 0;
  }
  return out;
}

export function parseMoveArgs(argv: readonly string[]): MoveArgs {
  const a = Args.parse(pairs(argv));
  return {
    apply: a.apply === true,
    ...(a.table === undefined ? {} : { table: a.table }),
    limit: a.limit ?? Number.MAX_SAFE_INTEGER,
    ...(a.after === undefined ? {} : { after: a.after }),
    batch: a.batch,
    maxBytes: a['max-mb'] * 1024 * 1024,
    pauseMs: a['pause-ms'],
    sample: a.sample,
  };
}
