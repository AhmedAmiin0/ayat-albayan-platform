import { posix } from 'node:path';
import type { Domain, Layer } from '../map/index.ts';
import { allowedTree } from './allowed.ts';
import { featureOf } from './feature-of.ts';

/** In the api a feature folder with a controller is its own Nest module (rule 13). */
export function nestProblems(
  files: readonly string[],
  scope: { layer: Layer; domains: readonly Domain[] },
): string[] {
  const ctx = { layer: scope.layer, allowed: allowedTree(scope.domains) };
  const dirsOf = (suffix: string): Set<string> =>
    new Set(files.filter((f) => f.endsWith(suffix)).map((f) => posix.dirname(f)));
  const modules = dirsOf('.module.ts');
  return [...dirsOf('.controller.ts')]
    .filter((d) => featureOf(`${d}/x`, ctx) === d && !modules.has(d))
    .sort()
    .map((d) => `feature controller without a Nest module: ${d}`);
}
