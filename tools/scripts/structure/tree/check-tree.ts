import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { LAYERS } from '../layers.ts';
import { LAYER_NAMES, type Domain } from '../map/index.ts';
import { facadeProblems } from './facades.ts';
import { featureProblems } from './features.ts';
import { nestProblems } from './nest.ts';
import { nestingProblems } from './nesting.ts';

const INDEX = /\/index\.tsx?$/;

/** docs/68 checks of a moved tree: names, indexes, Nest modules, facades and doubled folders. */
export function checkTree(
  root: string,
  trees: { before: readonly string[]; after: readonly string[] },
  domains: readonly Domain[],
): string[] {
  const { after } = trees;
  const perLayer = LAYER_NAMES.flatMap((name) => {
    const layer = LAYERS[name];
    const indexes = after
      .filter((f) => f.startsWith(`${layer.root}/`) && INDEX.test(f))
      .map((file) => ({ file, text: readFileSync(posix.join(root, file), 'utf8') }));
    return [
      ...featureProblems(after, layer, domains),
      ...facadeProblems(indexes, { layer, domains }),
      ...(name === 'api' ? nestProblems(after, layer.root) : []),
    ];
  });
  return [...perLayer, ...nestingProblems(trees.before, after)];
}
