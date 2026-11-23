import { foldArgs, type FoldArgs } from './args.schemas.ts';

const BOOLEANS = ['--dry-run', '--write', '--skip-open-prs'];
const isFlag = (a: string): boolean => a.startsWith('--');

/** The words after `--paths` up to the next flag. */
function pathsOf(args: readonly string[]): { paths: string[]; used: Set<number> } {
  const at = args.indexOf('--paths');
  const end = args.findIndex((a, i) => i > at && isFlag(a));
  const stop = end < 0 ? args.length : end;
  const range = at < 0 ? [] : Array.from({ length: stop - at }, (_, i) => at + i);
  return { paths: range.slice(1).map((i) => args[i] ?? ''), used: new Set(range) };
}

/** `units:fold` argv (pnpm's lone `--` dropped) → flags, through the zod schema. */
export function parseFoldArgs(argv: readonly string[]): FoldArgs {
  const args = argv.filter((a) => a !== '--');
  const { paths, used } = pathsOf(args);
  const known = new Set(BOOLEANS);
  return foldArgs.parse({
    dryRun: args.includes('--dry-run'),
    write: args.includes('--write'),
    skipOpenPrs: args.includes('--skip-open-prs'),
    paths,
    unknown: args.filter((a, i) => !used.has(i) && !known.has(a)),
  });
}
