import type { FloatingUnit } from '../scan/scan.types.ts';
import type { FolderPlan, PlanInput, Skip, SkipKind, UnitPlan } from './plan.types.ts';
import { floatingIn } from '../scan/floating.ts';
import { exclusionOf, foldersOf } from '../scan/tree.ts';
import { capReason } from './cap.ts';
import { planUnit } from './targets.ts';

interface Ctx {
  dir: string;
  units: UnitPlan[];
  input: PlanInput;
  under: string[];
}

const barrels = (units: UnitPlan[]): string[] =>
  units.filter((u) => u.unit.action === 'fold').map((u) => `${u.home}/index.ts`);

const existing = (c: Ctx): string | undefined =>
  c.units
    .filter((u) => u.unit.action === 'fold' && c.under.some((p) => p.startsWith(`${u.home}/`)))
    .map((u) => `${u.unit.name}/ already exists`)[0];

function namedByPath(c: Ctx): string | undefined {
  const moved = c.units.flatMap((u) => u.moves.map((m) => m.from));
  const hit = moved.find((f) => c.input.refs.has(f));
  return hit === undefined
    ? undefined
    : `${hit} is named by path in ${(c.input.refs.get(hit) ?? []).join(', ')}`;
}

function openPrs(c: Ctx): string | undefined {
  const prs = c.input.prDirs.get(c.dir);
  return prs === undefined ? undefined : `open PR ${prs.map((n) => `#${n}`).join(', ')} touches it`;
}

/** Each reason a folder stays as it is, in the order they are reported. */
const SKIPS: [SkipKind, (c: Ctx) => string | undefined][] = [
  ['excluded', (c) => exclusionOf(c.dir)?.why],
  ['open PR', openPrs],
  ['exists', existing],
  [
    'cap',
    (c) =>
      capReason(
        c.under,
        c.units.flatMap((u) => u.moves),
        barrels(c.units),
      ),
  ],
  ['named by path', namedByPath],
];

function skipOf(c: Ctx): Skip | undefined {
  for (const [kind, check] of SKIPS) {
    const why = check(c);
    if (why !== undefined) return { kind, why };
  }
  return undefined;
}

const inside = (dir: string, prefixes: readonly string[]): boolean =>
  prefixes.some((p) => `${dir}/`.startsWith(`${p.replace(/\/$/, '')}/`));

function planFolder(dir: string, floating: FloatingUnit[], input: PlanInput): FolderPlan {
  const tracked = new Set(input.paths);
  const units = floating.map((u) => planUnit(u, tracked));
  const under = input.paths.filter((p) => p.startsWith(`${dir}/`));
  const ctx = { dir, units, input, under };
  const skip = skipOf(ctx);
  return skip === undefined ? { dir, units } : { dir, units, skip };
}

/** One plan per folder holding a floating unit, sorted by folder. */
export function planFolders(input: PlanInput): FolderPlan[] {
  return [...foldersOf(input.paths)]
    .filter(([dir]) => input.only === undefined || inside(dir, input.only))
    .map(([dir, names]) => ({ dir, floating: floatingIn(dir, names) }))
    .filter(({ floating }) => floating.length > 0)
    .sort((a, b) => a.dir.localeCompare(b.dir))
    .map(({ dir, floating }) => planFolder(dir, floating, input));
}
