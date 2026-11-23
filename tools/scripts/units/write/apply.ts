import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import type { FolderPlan, Move } from '../plan/plan.types.ts';
import type { Applied } from './write.types.ts';
import { readText } from '../../ci-checks/move-module/files.ts';
import { barrelText } from './barrel.ts';
import { updateFolderCap } from './folder-cap.ts';
import { isPathJson, renameJsonText } from './json-paths.ts';
import { rewriteRepo } from './rewrite.ts';

const git = (root: string, args: string[]): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

function gitMove(root: string, m: Move): void {
  mkdirSync(posix.dirname(posix.join(root, m.to)), { recursive: true });
  git(root, ['mv', m.from, m.to]);
}

/** Old path → its unit's new folder, for the folded units (they get an index.ts). */
const homesOf = (plans: readonly FolderPlan[]): Map<string, string> =>
  new Map(
    plans.flatMap((p) =>
      p.units
        .filter((u) => u.unit.action === 'fold')
        .flatMap((u) => u.moves.map((m): [string, string] => [m.from, u.home])),
    ),
  );

function renameJsons(root: string, moves: readonly Move[]): string[] {
  const files = git(root, ['ls-files']).split('\n').filter(isPathJson);
  return files.filter((file) => {
    const text = readText(root, file);
    const next = renameJsonText(file, text, moves);
    if (next !== text) writeFileSync(posix.join(root, file), next);
    return next !== text;
  });
}

/** Rewrites every reference, moves the files with `git mv`, writes the barrels and baselines. */
export function applyPlans(root: string, plans: readonly FolderPlan[]): Applied {
  const active = plans.filter((p) => p.skip === undefined);
  const moves = active.flatMap((p) => p.units.flatMap((u) => u.moves));
  const renamed = new Map(moves.map((m) => [m.from, m.to]));
  const { texts, barrels } = rewriteRepo({ root, renamed, homes: homesOf(active) });
  texts.forEach((text, file) => writeFileSync(posix.join(root, file), text));
  moves.forEach((m) => gitMove(root, m));
  const written = [...barrels].map(([home, use]) => {
    const file = posix.join(home, 'index.ts');
    writeFileSync(
      posix.join(root, file),
      barrelText(use, (f) => readText(root, f)),
    );
    return file;
  });
  if (written.length > 0) git(root, ['add', '--', ...written]);
  const json = renameJsons(root, moves);
  updateFolderCap(
    root,
    active.map((p) => p.dir),
  );
  return { moved: moves.length, rewritten: texts.size, barrels: written, json };
}
