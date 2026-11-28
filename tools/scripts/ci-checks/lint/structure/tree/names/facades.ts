import { posix } from 'node:path';
import type { Domain, Layer } from '../../map/index.ts';
import { allowedTree } from './allowed.ts';
import { featureOf, partsOf } from './feature-of.ts';
import type { Allowed } from '../tree.types.ts';

const RE_EXPORT =
  /export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
const isIndex = (file: string): boolean => /\/index\.tsx?$/.test(file);

function resolve(spec: string, ctx: { file: string; layer: Layer }): string | undefined {
  if (spec.startsWith('.')) return posix.normalize(posix.join(posix.dirname(ctx.file), spec));
  if (ctx.layer.alias && spec.startsWith('@/')) {
    return posix.join(ctx.layer.workspace, 'src', spec.slice(2));
  }
  return undefined;
}

/** A domain or group folder: its barrel may only gather what lies below it. */
const isContainer = (parts: readonly string[], groups: ReadonlySet<string> | undefined): boolean =>
  parts.length === 1 || (parts.length === 2 && groups?.has(parts[1] ?? '') === true);

export function containerOf(
  dir: string,
  ctx: { layer: Layer; allowed: Allowed },
): string | undefined {
  const parts = partsOf(dir, ctx.layer.root);
  const domain = ctx.allowed.get(parts[0] ?? '');
  const groups = domain === undefined ? undefined : new Set(domain.groups.keys());
  return domain !== undefined && isContainer(parts, groups) ? dir : undefined;
}

/** Barrels in a feature that re-export what another feature holds (a facade, rule 23 / docs/68). */
export function facadeProblems(
  sources: readonly { file: string; text: string }[],
  scope: { layer: Layer; domains: readonly Domain[] },
): string[] {
  const ctx = { layer: scope.layer, allowed: allowedTree(scope.domains) };
  return sources
    .filter((s) => isIndex(s.file))
    .flatMap((s) => {
      const home = featureOf(s.file, ctx) ?? containerOf(posix.dirname(s.file), ctx);
      if (home === undefined) return [];
      return [...s.text.matchAll(RE_EXPORT)].flatMap(([, spec = '']) => {
        const to = resolve(spec, { file: s.file, layer: scope.layer });
        if (to === undefined || to === home || to.startsWith(`${home}/`)) return [];
        return [`facade: ${s.file} re-exports ${spec} from outside ${home}`];
      });
    });
}
