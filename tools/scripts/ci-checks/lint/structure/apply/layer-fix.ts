import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import { readText, writeIfChanged } from '../../../move-module/files.ts';
import { loadAliases } from '../../../move-module/resolve.ts';
import { newProject } from '../../../move-module/rewrite.ts';
import { LAYERS } from '../layers.ts';
import { LAYER_NAMES, type Domain, type Layer } from '../map/index.ts';
import { featureOf } from '../tree/names/feature-of.ts';
import type { Allowed } from '../tree/tree.types.ts';
import { allowedTree } from '../tree/names/allowed.ts';
import { BOUNDARIES } from './lint/boundaries.data.ts';
import { editBoundaries } from './lint/boundaries.ts';
import { entryPins } from './indexes/entry-pins.ts';
import { fixFeatureIndexes } from './indexes/feature-index.ts';
import { rewriteLintPaths } from './lint/lint-paths.ts';
import type { Moves } from '../tree/tree.types.ts';

const CODE = /\.[cm]?[jt]sx?$/;
const INDEXES = ['index.ts', 'index.tsx'];
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$|\/tests?\//;

interface LayerRun {
  root: string;
  files: readonly string[];
  domains: readonly Domain[];
  forced: Set<string>;
  oldOf: (file: string) => string;
}

/** Feature folders of `files` that have code but no index.ts on disk. */
function withoutIndex(
  root: string,
  files: readonly string[],
  ctx: { layer: Layer; allowed: Allowed },
): Set<string> {
  const features = new Set(files.flatMap((f) => featureOf(f, ctx) ?? []));
  return new Set(
    [...features].filter((d) => !INDEXES.some((n) => existsSync(posix.join(root, d, n)))),
  );
}

/** Every layer's cross-feature imports through feature indexes; returns the problems. */
export function fixLayers(run: LayerRun): string[] {
  const r = { root: run.root, aliases: loadAliases(run.root), renamed: new Map<string, string>() };
  const allowed = allowedTree(run.domains);
  return LAYER_NAMES.flatMap((name) => {
    const layer = LAYERS[name];
    const base = { project: newProject(), r, layer, allowed, old: BOUNDARIES[name].old };
    const ctx = { ...base, oldOf: run.oldOf, forced: run.forced, open: new Set<string>() };
    const files = run.files.filter(
      (f) => f.startsWith(`${layer.workspace}/`) && CODE.test(f) && !TEST.test(f),
    );
    const first = fixFeatureIndexes(ctx, files);
    first.writes.forEach((text, file) => writeIfChanged(run.root, file, text));
    const open = withoutIndex(run.root, files, { layer, allowed });
    const second = fixFeatureIndexes({ ...ctx, open }, files);
    second.writes.forEach((text, file) => writeIfChanged(run.root, file, text));
    const pin = entryPins(ctx, [...first.names, ...second.names]);
    if (pin !== undefined) writeIfChanged(run.root, pin.file, pin.text);
    return [...first.problems, ...second.problems];
  });
}

/** Every lint.blocks boundary and path after the moves; edits that no longer apply are problems. */
export function fixLintBlocks(
  root: string,
  ctx: { domains: readonly Domain[]; moves: Moves },
): string[] {
  return LAYER_NAMES.flatMap((name) => {
    const { file, edits } = BOUNDARIES[name];
    const edited = editBoundaries(readText(root, file), edits, ctx.domains);
    const paths = rewriteLintPaths(edited.text, {
      workspace: posix.dirname(file),
      moves: ctx.moves,
    });
    writeIfChanged(root, file, paths.text);
    return [
      ...edited.missing.map((m) => `${file}: boundary text not found: ${m.split('\n')[0] ?? ''}`),
      ...paths.stale.map((s) => `stale lint path: ${s}`),
    ];
  });
}
