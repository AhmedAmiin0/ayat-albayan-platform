import type { Layer } from '../map/index.ts';
import type { Allowed } from './tree.types.ts';

/** The path's segments below the layer root; none when it lies outside. */
export const partsOf = (path: string, root: string): string[] =>
  path.startsWith(`${root}/`) ? path.slice(root.length + 1).split('/') : [];

const isGroup = (allowed: Allowed, parts: readonly string[]): boolean =>
  allowed.get(parts[0] ?? '')?.groups.has(parts[1] ?? '') === true;

/** The feature folder `path` sits in (`root/domain/feature`, or `root/domain/group/feature`). */
export function featureOf(
  path: string,
  ctx: { layer: Layer; allowed: Allowed },
): string | undefined {
  const parts = partsOf(path, ctx.layer.root);
  const depth = isGroup(ctx.allowed, parts) ? 3 : 2;
  const known = ctx.allowed.has(parts[0] ?? '') && parts.length > depth;
  return known ? [ctx.layer.root, ...parts.slice(0, depth)].join('/') : undefined;
}
