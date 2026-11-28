import { applyPairs } from '../../ci-checks/move-module/run.ts';
import { trackedFiles } from '../../units/scan/tree.ts';
import type { StructureMap } from '../map/index.ts';
import { planMoves, type Plan } from '../plan/index.ts';
import { foldersOf } from '../tree/folders.ts';
import { fixReads } from './reads.ts';
import type { Moves } from '../tree/tree.types.ts';
import { updateBaselines } from './baselines.ts';
import { dropBarrels } from './drop-barrels.ts';
import { fixLayers, fixLintBlocks } from './layer-fix.ts';

export interface Applied {
  plan: Plan;
  moves: Moves;
  problems: string[];
  applied: boolean;
}

/** Problems that make the moves unsafe to apply (the rest are reported after applying). */
const BLOCKING =
  /^(two sources|target exists|two rules|across workspaces|route file moved|missing barrel)/;

const TMP = '.structure-tmp';
const tmpOf = (file: string): string => {
  const [group, ws, ...rest] = file.split('/');
  return [group, ws, TMP, ...rest].join('/');
};

/** The moves, with a file whose target another source holds parked under a temporary name first. */
function movePhased(root: string, pairs: [string, string][]): void {
  const sources = new Set(pairs.map(([from]) => from));
  const parked = pairs
    .filter(([, to]) => sources.has(to))
    .map(([from]): [string, string] => [from, tmpOf(from)]);
  if (parked.length > 0) applyPairs(root, parked);
  const park = new Map(parked);
  applyPairs(
    root,
    pairs.map(([from, to]): [string, string] => [park.get(from) ?? from, to]),
  );
}

/** Applies map.json to the checkout at `root`: moves, barrels, indexes, lint and baselines. */
export function applyStructure(root: string, map: StructureMap): Applied {
  const before = trackedFiles(root);
  const plan = planMoves(before, map);
  const moves: Moves = {
    files: new Map(plan.pairs),
    before: new Set(before),
    folders: foldersOf(before),
  };
  if (plan.problems.some((p) => BLOCKING.test(p))) {
    return { plan, moves, problems: plan.problems, applied: false };
  }
  const reads = fixReads(root, { files: before, moves });
  const dropped = dropBarrels(root, plan.drops, before);
  movePhased(root, plan.pairs);
  const to = (f: string): string => moves.files.get(f) ?? f;
  const back = new Map(plan.pairs.map(([from, dest]) => [dest, from]));
  const after = before.filter((f) => !plan.drops.includes(f)).map(to);
  const forced = new Set(dropped.written.map(([f, t]) => `${to(f)}→${to(t)}`));
  const indexProblems = fixLayers({
    root,
    files: [...new Set(after)],
    domains: map.domains,
    forced,
    oldOf: (f) => back.get(f) ?? f,
  });
  const lint = fixLintBlocks(root, { domains: map.domains, moves });
  updateBaselines(root, moves);
  return {
    plan,
    moves,
    problems: [...plan.problems, ...reads, ...dropped.problems, ...indexProblems, ...lint],
    applied: true,
  };
}
