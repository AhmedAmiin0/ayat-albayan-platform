import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { parseExcludes } from '../../components/cli/discover.ts';
import { formatFiles, writeFiles } from '../../components/cli/write.ts';
import { trackedFiles } from '../../scan/tree.ts';
import { parseApiOneArgs } from './args.ts';
import type { ApiOneIo } from './cli.types.ts';
import { inScope, planAll } from './plan.ts';
import { reportLines } from './report.ts';

/** `pnpm api:one -- [--write] [--exclude <file>]`: dry run by default (docs/62 part 3 §3b). */
export function runApiOne(argv: readonly string[], io: ApiOneIo): void {
  const args = parseApiOneArgs(argv);
  const excludes =
    args.exclude === undefined
      ? new Map<string, string>()
      : parseExcludes(readFileSync(posix.resolve(io.cwd, args.exclude), 'utf8'));
  const files = trackedFiles(io.root)
    .filter((path) => inScope(path) && existsSync(posix.join(io.root, path)))
    .map((path) => ({ path, text: readFileSync(posix.join(io.root, path), 'utf8') }));
  const planned = planAll(files, excludes);
  reportLines(planned.rows).forEach((line) => io.log(line));
  if (!args.write) return;
  const written = writeFiles(io.root, planned.files, io.format ?? formatFiles).length;
  io.log(`api:one: ${written} files written`);
}
