import { posix } from 'node:path';
import { LAYERS } from '../layers.ts';
import type { Domain } from '../map/index.ts';
import { allowedTree } from './allowed.ts';
import { containerOf } from './facades.ts';
import { featureOf, partsOf } from './feature-of.ts';

/** A domain folder (and an app's group folder) may hold no barrel: nothing is at home there. */
const NOWHERE = '\u0000';

/** The folder a barrel at `file` may gather from: its feature, a package group, else its own. */
export function homeOf(domains: readonly Domain[]): (file: string) => string {
  const allowed = allowedTree(domains);
  const layers = Object.values(LAYERS);
  return (file) => {
    const layer = layers.find((l) => file.startsWith(`${l.root}/`));
    const dir = posix.dirname(file);
    if (layer === undefined) return dir;
    const ctx = { layer, allowed };
    const feature = featureOf(file, ctx);
    const container = containerOf(dir, ctx);
    const isGroup =
      container !== undefined && container !== `${layer.root}/${partsOf(dir, layer.root)[0] ?? ''}`;
    const groupHome = isGroup && !layer.alias ? container : undefined;
    return feature ?? groupHome ?? (container === undefined ? dir : NOWHERE);
  };
}
