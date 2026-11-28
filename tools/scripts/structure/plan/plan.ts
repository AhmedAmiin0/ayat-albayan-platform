import type { Drop, Move } from '../map/index.ts';
import { LAYERS } from '../layers.ts';
import { bestRule, rulesOf } from './match.ts';
import type { Plan, Rule } from './plan.types.ts';
import { targetProblems } from './targets.ts';

const workspace = (path: string): string => path.split('/').slice(0, 2).join('/');
const ROUTES = Object.values(LAYERS).flatMap((l) => l.routes);
const isRoute = (file: string): boolean =>
  ROUTES.some((r) => file === r || file.startsWith(`${r}/`));

interface Picked {
  pairs: [string, string][];
  used: Set<number>;
  problems: string[];
}

function pick(files: readonly string[], rules: readonly Rule[]): Picked {
  const out: Picked = { pairs: [], used: new Set(), problems: [] };
  for (const file of files) {
    const best = bestRule(rules, file);
    best.forEach((r) => out.used.add(r.index));
    const [rule] = best;
    if (best.length > 1) {
      out.problems.push(`two rules take ${file}: ${best.map((r) => r.from).join(', ')}`);
    }
    const to = rule?.match(file);
    if (to !== undefined && to !== file) out.pairs.push([file, to]);
  }
  return out;
}

function ruleProblems(
  files: readonly string[],
  rules: readonly Rule[],
  used: Set<number>,
): string[] {
  return rules
    .filter((r) => !used.has(r.index))
    .map((r) => {
      const any = files.some((f) => r.match(f) !== undefined);
      return any
        ? `shadowed: ${r.from} takes no file (move ${r.index})`
        : `missing source: ${r.from} (move ${r.index})`;
    });
}

const pairProblems = (pairs: readonly [string, string][]): string[] => [
  ...pairs
    .filter(([from, to]) => workspace(from) !== workspace(to))
    .map(([from, to]) => `across workspaces: ${from} → ${to}`),
  ...pairs.filter(([from]) => isRoute(from)).map(([from]) => `route file moved: ${from}`),
];

/** The file moves of map.json over a file list (most specific rule wins), with what blocks them. */
export function planMoves(
  files: readonly string[],
  map: { moves: readonly Move[]; drops: readonly Drop[] },
): Plan {
  const present = new Set(files);
  const drops = map.drops.map((d) => d.drop);
  const kept = files.filter((f) => !drops.includes(f));
  const rules = rulesOf(map.moves);
  const picked = pick(kept, rules);
  const pairs = picked.pairs.sort(([a], [b]) => a.localeCompare(b));
  return {
    pairs,
    drops: drops.filter((d) => present.has(d)),
    problems: [
      ...drops.filter((d) => !present.has(d)).map((d) => `missing barrel: ${d}`),
      ...ruleProblems(kept, rules, picked.used),
      ...picked.problems,
      ...targetProblems(kept, pairs),
      ...pairProblems(pairs),
    ],
  };
}
