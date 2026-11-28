import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { LAYERS } from '../layers.ts';
import { LAYER_NAMES, type LayerName, type StructureMap } from '../map/index.ts';
import { facadeProblems } from '../tree/facades.ts';
import { featureProblems } from '../tree/features.ts';
import { nestProblems } from '../tree/nest.ts';

const INDEX = /\/index\.tsx?$/;

export interface GateIo {
  root: string;
  files: readonly string[];
  log: (line: string) => void;
}

/** One layer: listed names, an index.ts per feature, no facades, api Nest modules. */
export function layerProblems(io: GateIo, name: LayerName, map: StructureMap): string[] {
  const layer = LAYERS[name];
  const indexes = io.files
    .filter((f) => f.startsWith(`${layer.root}/`) && INDEX.test(f))
    .map((file) => ({ file, text: readFileSync(posix.join(io.root, file), 'utf8') }));
  return [
    ...featureProblems(io.files, layer, map.domains),
    ...facadeProblems(indexes, { layer, domains: map.domains }),
    ...(name === 'api' ? nestProblems(io.files, { layer, domains: map.domains }) : []),
  ];
}

/** guard:structure over the given layers (all by default); returns the exit code. */
export function runGate(
  io: GateIo,
  opts: { map: StructureMap; layers: readonly LayerName[] },
): number {
  const problems = opts.layers.flatMap((name) =>
    layerProblems(io, name, opts.map).map((p) => `${name}: ${p}`),
  );
  problems.forEach((p) => io.log(`  ${p}`));
  io.log(`structure: ${problems.length} problems in ${opts.layers.length} layers`);
  return problems.length > 0 ? 1 : 0;
}

export const ALL_LAYERS: readonly LayerName[] = LAYER_NAMES;
