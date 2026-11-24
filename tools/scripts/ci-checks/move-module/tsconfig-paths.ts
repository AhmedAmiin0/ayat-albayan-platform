import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { ts } from 'ts-morph';
import { z } from 'zod';

/** A `paths` entry of a workspace, its target repo-relative: `@/*` → `apps/staff-web/src/*`. */
interface WorkspacePath {
  key: string;
  target: string;
}

const CONFIG_DIR = '${configDir}';
const TSCONFIG = z.object({
  extends: z.string().optional(),
  compilerOptions: z
    .object({
      baseUrl: z.string().optional(),
      paths: z.record(z.string(), z.array(z.string())).optional(),
    })
    .optional(),
});
type Tsconfig = z.infer<typeof TSCONFIG>;

interface Found {
  config: Tsconfig;
  dir: string;
}

const isRelative = (spec: string): boolean => spec.startsWith('./') || spec.startsWith('../');

/** The file and every tsconfig it extends by a relative path, nearest first. */
function chain(root: string, file: string): Found[] {
  const abs = posix.join(root, file);
  if (!existsSync(abs)) return [];
  const json = ts.parseConfigFileTextToJson(abs, readFileSync(abs, 'utf8'));
  const parsed = TSCONFIG.parse(json.config);
  const dir = posix.dirname(file);
  const next = parsed.extends ?? '';
  const parents = isRelative(next) ? chain(root, posix.normalize(posix.join(dir, next))) : [];
  return [{ config: parsed, dir }, ...parents];
}

const hasPaths = (f: Found): boolean => f.config.compilerOptions?.paths !== undefined;

/** A target as a repo path: `${configDir}` is the workspace, anything else is from `base`. */
const targetIn = (at: { scope: string; base: string }, target: string): string =>
  target.startsWith(CONFIG_DIR)
    ? posix.join(at.scope, target.slice(CONFIG_DIR.length))
    : posix.join(at.base, target);

function pathsOf(scope: string, found: Found = { config: {}, dir: scope }): WorkspacePath[] {
  const opts = found.config.compilerOptions ?? {};
  const at = { scope, base: posix.join(found.dir, opts.baseUrl ?? '.') };
  return Object.entries(opts.paths ?? {}).flatMap(([key, [target]]) =>
    target === undefined ? [] : [{ key, target: targetIn(at, target) }],
  );
}

const configOf = (scope: string): string => posix.join(scope, 'tsconfig.json');

/**
 * The `paths` a workspace's tsconfig ends up with, as TypeScript reads them: the nearest config
 * in its `extends` chain that sets them wins, `${configDir}` is the workspace folder and other
 * targets resolve from that config's `baseUrl` or folder.
 */
export const workspacePaths = (root: string, scope: string): WorkspacePath[] =>
  pathsOf(scope, chain(root, configOf(scope)).find(hasPaths));

/** Only the `paths` the workspace's own tsconfig.json sets, none inherited. */
export const ownPaths = (root: string, scope: string): WorkspacePath[] =>
  pathsOf(scope, chain(root, configOf(scope)).slice(0, 1).find(hasPaths));
