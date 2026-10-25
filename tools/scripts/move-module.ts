// Pure-move codemod (docs/27 §4). Usage, from the repo root:
//   node tools/scripts/move-module.ts refactor/moves/<id>.json   apply one move map
//   node tools/scripts/move-module.ts --replay                   apply every committed map (an open branch follows the moves)
// It rewrites imports, re-exports, import(), require, vi/jest mock paths and `@/` aliases across the whole
// monorepo, moves tests and __snapshots__ with their files and writes the map's index.ts barrels. Run twice = no diff.
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replay, runMap, type RunReport } from './move-module/run.ts';

const root = posix.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const at = args.indexOf('--root');
const base = at >= 0 ? posix.resolve(args[at + 1] ?? '.') : root;
const maps = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--root');

const print = (r: RunReport): void => console.log(`${r.id}: ${r.moved} moved, ${r.rewritten} files rewritten`);

if (args.includes('--replay')) replay(base).forEach(print);
else if (maps.length > 0) maps.forEach((m) => print(runMap(base, m)));
else {
  console.error('usage: move-module.ts <refactor/moves/<id>.json>… | --replay [--root <dir>]');
  process.exit(2);
}
