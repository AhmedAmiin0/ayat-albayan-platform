import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import type { Project } from 'ts-morph';
import { readText } from '../../../../move-module/files.ts';
import type { Resolver } from '../../../../move-module/resolve.ts';
import type { Layer } from '../../map/index.ts';
import { exportSources } from '../barrels/barrel-names.ts';

const PACKAGE_STAR = /^export \* from '@ab\/([a-z-]+)';$/gm;

/**
 * A package entry that star-exports another package and now also reaches a feature name of the
 * same spelling (through the feature's new index) would be ambiguous; an explicit re-export from
 * that package keeps the name the entry exported before the moves.
 */
export function entryPins(
  ctx: { project: Project; r: Resolver; layer: Layer },
  names: readonly string[],
): { file: string; text: string } | undefined {
  const entry = `${ctx.layer.root}/index.ts`;
  if (ctx.layer.alias || !existsSync(posix.join(ctx.r.root, entry))) return undefined;
  const text = readText(ctx.r.root, entry);
  const wanted = new Set(names);
  const pins = [...text.matchAll(PACKAGE_STAR)].flatMap(([, pkg = '']) => {
    const src = `packages/${pkg}/src/index.ts`;
    if (!existsSync(posix.join(ctx.r.root, src))) return [];
    const hits = [...exportSources(ctx, src).keys()].filter((n) => wanted.has(n)).sort();
    return hits.length === 0 ? [] : [`export { ${hits.join(', ')} } from '@ab/${pkg}';`];
  });
  return pins.length === 0 ? undefined : { file: entry, text: `${text}${pins.join('\n')}\n` };
}
