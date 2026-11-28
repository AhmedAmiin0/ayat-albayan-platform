// Usage (repo root): node tools/scripts/structure/move.ts [--dry-run [--base <ref>] [--no-typecheck]]
// Applies refactor/structure/map.json (docs/68): without --dry-run to this checkout, with it to a
// temporary worktree of <ref> (default HEAD), printing every problem; exit 1 on any.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { applyStructure } from './apply/apply.ts';
import { dryRun } from './dry-run.ts';
import { readStructureMap } from './map/index.ts';

const repo = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const args = process.argv.slice(2);
const at = args.indexOf('--base');
const base = at >= 0 ? (args[at + 1] ?? 'HEAD') : 'HEAD';
const map = readStructureMap(repo);

function format(root: string): void {
  execFileSync('git', ['add', '-A'], { cwd: root });
  const changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=AMR'], {
    cwd: root,
    encoding: 'utf8',
  }).split('\n').filter((f) => /\.(?:[cm]?[jt]sx?|json)$/.test(f));
  if (changed.length > 0) execFileSync('pnpm', ['exec', 'oxfmt', ...changed], { cwd: root, stdio: 'inherit' });
}

const problems = args.includes('--dry-run')
  ? dryRun(map, { repo, base, typecheck: !args.includes('--no-typecheck') })
  : (() => {
      const out = applyStructure(repo, map);
      if (out.applied) format(repo);
      console.log(`structure: ${out.plan.pairs.length} files moved, ${out.plan.drops.length} barrels dropped`);
      return out.problems;
    })();
problems.forEach((p) => console.log(`  ${p}`));
console.log(`structure: ${problems.length} problems`);
process.exitCode = problems.length > 0 ? 1 : 0;
