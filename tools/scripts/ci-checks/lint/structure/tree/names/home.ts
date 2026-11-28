import { posix } from 'node:path';
import { LAYERS } from '../../layers.ts';
import type { Domain, Layer } from '../../map/index.ts';
import type { Allowed } from '../tree.types.ts';
import { allowedTree } from './allowed.ts';
import { containerOf } from './facades.ts';
import { featureOf, partsOf } from './feature-of.ts';

/** A domain folder (and an app's group folder) may hold no barrel: nothing is at home there. */
const NOWHERE = '\u0000';

/** A package's group folder may gather its features; a domain folder holds no barrel. */
function containerHome(ctx: { layer: Layer; allowed: Allowed }, dir: string): string {
  const parts = partsOf(dir, ctx.layer.root);
  const isPackageGroup = parts.length === 2 && !ctx.layer.alias;
  return isPackageGroup ? dir : NOWHERE;
}

function homeIn(ctx: { layer: Layer; allowed: Allowed }, file: string): string {
  const dir = posix.dirname(file);
  const feature = featureOf(file, ctx);
  if (feature !== undefined) return feature;
  return containerOf(dir, ctx) === undefined ? dir : containerHome(ctx, dir);
}

/** The folder a barrel at `file` may gather from: its feature, a package group, else its own. */
export function homeOf(domains: readonly Domain[]): (file: string) => string {
  const allowed = allowedTree(domains);
  const layers = Object.values(LAYERS);
  return (file) => {
    const layer = layers.find((l) => file.startsWith(`${l.root}/`));
    const dir = posix.dirname(file);
    return layer === undefined ? dir : homeIn({ layer, allowed }, file);
  };
}
