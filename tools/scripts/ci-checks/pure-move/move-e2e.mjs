// Whether a move PR may skip e2e (ci.yml «changes», step «move PR»; docs/32 g1). Usage:
//   git diff --name-status -M50% <base>...HEAD | node tools/scripts/ci-checks/pure-move/move-e2e.mjs   exit 0 = may skip
// pure-move-check must pass too (the step runs it after). Only plain folder moves qualify: the diff adds or
// changes a move map, no map renames an identifier, no file changes its name (a stem rename lets string
// literals follow it), no web route moves (its URL would change), and nothing e2e reads at start-up changes
// (e2e/, workflows, any *.config.*, tsconfig, the route tree). FAIL SAFE: anything else = e2e runs.
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseNameStatus } from '../pure-move-check.mjs';

const MAP = /^refactor\/moves\/[^/]+\.json$/;
const STARTUP = /^(e2e\/|\.github\/)|(^|\/)([^/]+\.config\.[cm]?[jt]s|tsconfig[^/]*\.json|routeTree\.gen\.ts)$/;
const ROUTES = /^apps\/web\/src\/routes\//;

/** Map text → number of identifier renames (a `renames` that is not an object counts as one). */
const renamesIn = (text) => {
  const r = JSON.parse(text)?.renames ?? {};
  return r !== null && typeof r === 'object' && !Array.isArray(r) ? Object.keys(r).length : 1;
};

/** `{ skip, reason }` for name-status entries; `readMap(file)` reads a map at head. */
export function moveVerdict(entries, readMap) {
  const maps = entries.filter((e) => MAP.test(e.to) && /^[AMR]/.test(e.status));
  if (maps.length === 0) return { skip: false, reason: 'no move map in the diff' };
  for (const e of entries) {
    const files = [e.from, e.to];
    if (files.some((f) => STARTUP.test(f))) return { skip: false, reason: `${e.to} is read when e2e starts` };
    if (e.status.startsWith('R') && posix.basename(e.from) !== posix.basename(e.to)) return { skip: false, reason: `${e.from} changes its name` };
    if (e.status.startsWith('R') && files.some((f) => ROUTES.test(f))) return { skip: false, reason: `route ${e.from} moves` };
  }
  const renames = maps.reduce((n, e) => n + renamesIn(readMap(e.to)), 0);
  if (renames > 0) return { skip: false, reason: `${renames} identifier rename(s)` };
  return { skip: true, reason: 'plain folder moves' };
}

function main() {
  let verdict;
  try {
    verdict = moveVerdict(parseNameStatus(readFileSync(0, 'utf8')), (f) => readFileSync(f, 'utf8'));
  } catch (e) {
    verdict = { skip: false, reason: `error: ${e instanceof Error ? e.message : e}` };
  }
  console.log(`move-e2e: ${verdict.skip ? 'may skip e2e' : 'e2e runs'} (${verdict.reason})`);
  process.exit(verdict.skip ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
