import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import type { Step } from './args.schemas.ts';
import { parseComponentArgs } from './args.ts';
import { repoContext } from './context.ts';
import { parseExcludes, targetsOf } from './discover.ts';
import { planAll } from './plan.ts';
import { reportLines } from './report.ts';
import { formatFiles, removeFiles, writeFiles } from './write.ts';
import { trackedFiles } from '../../scan/tree.ts';
import { groupBy } from '../model/group.ts';
import { subfoldersOf } from './subfolders.ts';

export interface ComponentsIo {
  root: string;
  cwd: string;
  log: (line: string) => void;
  /** Formats written files; oxlint class-A fixes and oxfmt unless a test passes its own. */
  format?: (root: string, paths: string[]) => void;
}

// adopt runs before hook: a same-name hook moved into the folder leaves the hook step done.
const ORDER: Step[] = ['types', 'helpers', 'split', 'adopt', 'hook'];

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
    subfolders: (dir: string) => subfoldersOf(paths, dir),
    excludes,
  };
  const steps = args.step === 'all' ? ORDER : [args.step];
  const planned = planAll(targetsOf(paths, only), steps, ctx);
  if (args.json) io.log(JSON.stringify({ rows: planned.rows }, null, 2));
  else reportLines(planned.rows).forEach((l) => io.log(l));
  if (!args.write) return;
  const written = writeFiles(io.root, planned.files, io.format ?? formatFiles).length;
  const removed = removeFiles(io.root, planned.deleted).length;
  io.log(`components: ${written} files written, ${removed} removed`);
}
