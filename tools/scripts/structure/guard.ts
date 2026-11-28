// Usage (repo root): pnpm guard:structure [-- <layer>…]
// docs/68: every app and package keeps one <domain>/<feature> tree whose names come from
// refactor/structure/map.json domains. Folder per unit is guard:units; imports through a
// feature's index.ts are the lint boundaries.
import { fileURLToPath } from 'node:url';
import { trackedFiles } from '../units/scan/tree.ts';
import { ALL_LAYERS, runGate } from './gate/gate.ts';
import { layerNameSchema, readStructureMap } from './map/index.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const picked = process.argv
  .slice(2)
  .filter((a) => a !== '--')
  .map((a) => layerNameSchema.parse(a));
const io = { root, files: trackedFiles(root), log: console.log };
process.exitCode = runGate(io, {
  map: readStructureMap(root),
  layers: picked.length > 0 ? picked : ALL_LAYERS,
});
