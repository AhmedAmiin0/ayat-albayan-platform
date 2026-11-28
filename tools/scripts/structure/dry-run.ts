import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { posix } from 'node:path';
import { trackedFiles } from '../units/scan/tree.ts';
import { applyStructure } from './apply/apply.ts';
import type { StructureMap } from './map/index.ts';
import { checkTree } from './tree/check-tree.ts';

export interface DryRunOptions {
  repo: string;
  base: string;
  typecheck: boolean;
  /** Leave the worktree in place to look at it (its path is printed). */
  keep: boolean;
}

const run = (cwd: string, cmd: string, args: string[]): { ok: boolean; out: string } => {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  return { ok: res.status === 0, out: `${res.stdout}${res.stderr}` };
};

function tools(root: string): string[] {
  const cap = run(root, 'node', ['tools/scripts/ci-checks/folder-cap.mjs', '--strict']);
  const capLines = cap.ok ? [] : cap.out.split('\n').filter((l) => /^\s+(new|grew|stale):/.test(l));
  return capLines.map((l) => `folder-cap: ${l.trim()}`);
}

function typecheck(root: string): string[] {
  const install = run(root, 'pnpm', ['install', '--frozen-lockfile', '--offline']);
  if (!install.ok) return [`pnpm install failed: ${install.out.slice(-400)}`];
  const tc = run(root, 'pnpm', ['turbo', 'typecheck', '--continue', '--output-logs=errors-only']);
  if (tc.ok) return [];
  return tc.out
    .split('\n')
    .filter((l) => /error TS\d+/.test(l))
    .map((l) => `typecheck: ${l.trim()}`);
}

/** Applies map.json to a fresh worktree of `base` and reports everything that would break. */
export function dryRun(map: StructureMap, opts: DryRunOptions): string[] {
  const dir = mkdtempSync(posix.join(tmpdir(), 'structure-dry-'));
  execFileSync('git', ['worktree', 'add', '--detach', dir, opts.base], {
    cwd: opts.repo,
    stdio: 'ignore',
  });
  try {
    const before = trackedFiles(dir);
    const applied = applyStructure(dir, map);
    if (!applied.applied) return applied.problems;
    execFileSync('git', ['add', '-A'], { cwd: dir });
    const after = trackedFiles(dir);
    const checks = checkTree(dir, { before, after }, map.domains);
    const types = opts.typecheck ? typecheck(dir) : [];
    return [...applied.problems, ...checks, ...tools(dir), ...types];
  } finally {
    const drop = ['worktree', 'remove', '--force', dir];
    if (opts.keep) console.log(`structure: worktree kept at ${dir}`);
    else execFileSync('git', drop, { cwd: opts.repo, stdio: 'ignore' });
  }
}
