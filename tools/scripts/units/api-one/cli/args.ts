import { apiOneArgs, type ApiOneArgs } from './args.schemas.ts';

/** `pnpm api:one` argv (pnpm's lone `--` dropped) → flags, through the zod schema. */
export function parseApiOneArgs(argv: readonly string[]): ApiOneArgs {
  const args = argv.filter((a) => a !== '--');
  const at = args.indexOf('--exclude');
  const exclude = at < 0 ? undefined : (args[at + 1] ?? '');
  const used = new Set(at < 0 ? [] : [at, at + 1]);
  return apiOneArgs.parse({
    write: args.includes('--write'),
    ...(exclude === undefined ? {} : { exclude }),
    unknown: args.filter((a, i) => !used.has(i) && a !== '--write'),
  });
}
