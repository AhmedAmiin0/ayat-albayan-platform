import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import type { FoldArgs } from './args/index.ts';
import type { FolderPlan } from '../plan/plan.types.ts';
import type { FloatingUnit } from '../scan/scan.types.ts';
import { ghIn, openPrDirs, readOpenPrs } from '../plan/open-prs.ts';
import { planFolders } from '../plan/plan.ts';
import { pathRefs } from '../plan/refs.ts';
import { folderLines, summaryLines, treeLines } from '../plan/report.ts';
import { componentUnitsIn, holdsComponent } from '../scan/components.ts';
import { trackedFiles } from '../scan/tree.ts';
import { applyPlans } from '../write/apply.ts';
import { parseFoldArgs } from './args/index.ts';
import type { FoldIo } from './cli.types.ts';

const readIn =
  (root: string) =>
  (file: string): string => {
    const abs = posix.join(root, file);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  };

function plansOf(args: FoldArgs, io: FoldIo): FolderPlan[] {
  const paths = trackedFiles(io.root);
  const only = args.paths.map((p) => posix.relative(io.root, posix.resolve(io.cwd, p)));
  const prDirs = args.skipOpenPrs
    ? openPrDirs(readOpenPrs(ghIn(io.root)))
    : new Map<string, number[]>();
  const read = readIn(io.root);
  const refs = pathRefs(paths, read);
  const scan = (dir: string, names: readonly string[]): FloatingUnit[] =>
    componentUnitsIn(dir, names, (path) => holdsComponent(read(path), path));
  const scanned = args.components ? { scan } : {};
  return planFolders({ paths, refs, prDirs, ...scanned, ...(only.length > 0 ? { only } : {}) });
}

function dryRun(plans: FolderPlan[], args: FoldArgs, io: FoldIo): void {
  [...summaryLines(plans), '', ...folderLines(plans)].forEach((l) => io.log(l));
  if (args.paths.length === 0) return;
  ['', ...treeLines(plans.filter((p) => p.skip === undefined))].forEach((l) => io.log(l));
}

function write(plans: FolderPlan[], io: FoldIo): void {
  const skipped = plans.flatMap((p) => (p.skip ? [`skipped ${p.dir}: ${p.skip.why}`] : []));
  skipped.forEach((l) => io.log(l));
  const done = applyPlans(io.root, plans);
  io.log(`units:fold: ${done.moved} files moved, ${done.rewritten} files rewritten`);
  done.barrels.forEach((f) => io.log(`  index: ${f}`));
  done.json.forEach((f) => io.log(`  baseline keys: ${f}`));
}

/** `pnpm units:fold -- --dry-run | --write --paths <dir...> [--skip-open-prs] [--components]` */
export function runFold(argv: readonly string[], io: FoldIo): void {
  const args = parseFoldArgs(argv);
  const plans = plansOf(args, io);
  if (args.dryRun) dryRun(plans, args, io);
  else write(plans, io);
}
