import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import type { Step } from './args.schemas.ts';
import { parseComponentArgs } from './args.ts';
import { repoContext } from './context.ts';
import { parseExcludes, targetsOf } from './discover.ts';
import { planAll } from './plan.ts';
import { reportLines } from './report.ts';
import { formatFiles, writeFiles } from './write.ts';
import { trackedFiles } from '../../scan/tree.ts';
import { groupBy } from '../model/group.ts';

export interface ComponentsIo {
  root: string;
  cwd: string;
  log: (line: string) => void;
  /** Formats written files; oxlint class-A fixes and oxfmt unless a test passes its own. */
  format?: (root: string, paths: string[]) => void;
}

const ORDER: Step[] = ['types', 'helpers', 'hook'];

/** `pnpm components -- --dry-run|--write [--step <s>] --paths <dir...> [--exclude <f>] [--json]` */
export function runComponents(argv: readonly string[], io: ComponentsIo): void {
  const args = parseComponentArgs(argv);
  const paths = trackedFiles(io.root);
  const only = args.paths.map((p) => posix.relative(io.root, posix.resolve(io.cwd, p)));
  const names = groupBy(paths, (p) => posix.dirname(p));
  const excludes =
    args.exclude === undefined
      ? new Map<string, string>()
      : parseExcludes(readFileSync(posix.resolve(io.cwd, args.exclude), 'utf8'));
  const ctx = {
    ...repoContext(io.root, paths),
    names: (dir: string) => (names.get(dir) ?? []).map((p) => posix.basename(p)),
    excludes,
  };
  const steps = args.step === 'all' ? ORDER : [args.step];
  const { rows, files } = planAll(targetsOf(paths, only), steps, ctx);
  if (args.json) io.log(JSON.stringify({ rows }, null, 2));
  else reportLines(rows).forEach((l) => io.log(l));
  if (args.write)
    io.log(
      `components: ${writeFiles(io.root, files, io.format ?? formatFiles).length} files written`,
    );
}
