import { posix } from 'node:path';
import { readText, writeIfChanged } from '../../ci-checks/move-module/files.ts';
import { loadAliases } from '../../ci-checks/move-module/resolve.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { LAYERS } from '../layers.ts';
import { LAYER_NAMES, type Domain } from '../map/index.ts';
import { allowedTree } from '../tree/allowed.ts';
import { BOUNDARIES } from './boundaries.data.ts';
import { editBoundaries } from './boundaries.ts';
import { fixFeatureIndexes } from './feature-index.ts';
import { rewriteLintPaths } from './lint-paths.ts';
import type { Moves } from '../tree/tree.types.ts';

const CODE = /\.[cm]?[jt]sx?$/;
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$|\/tests?\//;

interface LayerRun {
  root: string;
  files: readonly string[];
  domains: readonly Domain[];
  forced: Set<string>;
  oldOf: (file: string) => string;
}

/** Every layer's cross-feature imports through feature indexes; returns the problems. */
export function fixLayers(run: LayerRun): string[] {
  const r = { root: run.root, aliases: loadAliases(run.root), renamed: new Map<string, string>() };
  const allowed = allowedTree(run.domains);
  return LAYER_NAMES.flatMap((name) => {
    const layer = LAYERS[name];
    const ctx = { project: newProject(), r, layer, allowed, old: BOUNDARIES[name].old, oldOf: run.oldOf, forced: run.forced };
    const files = run.files.filter((f) => f.startsWith(`${layer.workspace}/`) && CODE.test(f) && !TEST.test(f));
    const work = fixFeatureIndexes(ctx, files);
    work.writes.forEach((text, file) => writeIfChanged(run.root, file, text));
    return work.problems;
  });
}

/** Every lint.blocks boundary and path after the moves; edits that no longer apply are problems. */
export function fixLintBlocks(root: string, ctx: { domains: readonly Domain[]; moves: Moves }): string[] {
  return LAYER_NAMES.flatMap((name) => {
    const { file, edits } = BOUNDARIES[name];
    const edited = editBoundaries(readText(root, file), edits, ctx.domains);
    const paths = rewriteLintPaths(edited.text, { workspace: posix.dirname(file), moves: ctx.moves });
    writeIfChanged(root, file, paths.text);
    return [...edited.missing.map((m) => `${file}: boundary text not found: ${m.split('\n')[0]}`), ...paths.stale.map((s) => `stale lint path: ${s}`)];
  });
}
