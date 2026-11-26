import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { z } from 'zod';
import { parseJson } from '../../units/json.ts';

// A package imports its own files by its name through its `exports` `./*` entry
// (`@ab/web-kit/lib/utils`, docs/32 R12), so a move rewrites a kit's `../` to that path.

const WILD = './src/*';
const entry = z.union([
  z.string(),
  z.looseObject({ default: z.string() }).transform((e) => e.default),
]);
const manifest = z.looseObject({
  name: z.string(),
  exports: z.record(z.string(), z.unknown()).optional(),
});

/** `[{ key: '@ab/web-kit/*', target: 'packages/web-kit/src/*' }]`, or none. */
export function selfExportPaths(root: string, scope: string): { key: string; target: string }[] {
  const file = posix.join(root, scope, 'package.json');
  if (!existsSync(file)) return [];
  const pkg = parseJson(readFileSync(file, 'utf8'), manifest);
  const wild = entry.safeParse(pkg.exports?.['./*']).data;
  return wild === WILD ? [{ key: `${pkg.name}/*`, target: posix.join(scope, 'src/*') }] : [];
}
