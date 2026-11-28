import type { Layer } from '../map/index.ts';
import type { Allowed } from './tree.types.ts';

/** The feature folder `path` sits in (`root/domain/feature`, or `root/domain/group/feature`). */
export function featureOf(path: string, ctx: { layer: Layer; allowed: Allowed }): string | undefined {
  const { root } = ctx.layer;
  if (!path.startsWith(`${root}/`)) return undefined;
  const parts = path.slice(root.length + 1).split('/');
  const d = ctx.allowed.get(parts[0]);
  if (d === undefined) return undefined;
  const depth = d.groups.has(parts[1]) ? 3 : 2;
  return parts.length > depth ? [root, ...parts.slice(0, depth)].join('/') : undefined;
}
