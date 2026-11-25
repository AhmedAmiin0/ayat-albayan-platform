import { componentArgs, type ComponentArgs } from './args.schemas.ts';

const BOOLEANS = new Set(['--dry-run', '--write', '--json']);
const VALUED = new Set(['--step', '--exclude']);

const valueOf = (args: readonly string[], flag: string): string | undefined => {
  const at = args.indexOf(flag);
  return at < 0 ? undefined : args[at + 1];
};

function pathsOf(args: readonly string[]): { paths: string[]; used: Set<number> } {
  const at = args.indexOf('--paths');
  const end = args.findIndex((a, i) => i > at && a.startsWith('--'));
  const stop = end < 0 ? args.length : end;
  const range = at < 0 ? [] : Array.from({ length: stop - at }, (_, i) => at + i);
  return { paths: range.slice(1).map((i) => args[i] ?? ''), used: new Set(range) };
}

/** `pnpm components` argv (pnpm's lone `--` dropped) → flags, through the zod schema. */
export function parseComponentArgs(argv: readonly string[]): ComponentArgs {
  const args = argv.filter((a) => a !== '--');
  const { paths, used } = pathsOf(args);
  const valued = new Set(args.flatMap((a, i) => (VALUED.has(a) ? [i, i + 1] : [])));
  const exclude = valueOf(args, '--exclude');
  return componentArgs.parse({
    dryRun: args.includes('--dry-run'),
    write: args.includes('--write'),
    json: args.includes('--json'),
    step: valueOf(args, '--step') ?? 'all',
    paths,
    ...(exclude === undefined ? {} : { exclude }),
    unknown: args.filter((a, i) => !used.has(i) && !valued.has(i) && !BOOLEANS.has(a)),
  });
}
