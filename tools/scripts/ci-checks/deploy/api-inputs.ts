// What the staging API image depends on (deploy-staging «Did the API change?»): apps/api, every
// workspace package it reaches through its dependencies and devDependencies (the api bundle
// compiles their source), and the files apps/api/Dockerfile and roll.sh read besides them. A
// deploy whose diff since the image's commit touches none of these needs no build and no roll.
import { globSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const manifestSchema = z.object({
  name: z.string(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});
type Manifest = z.infer<typeof manifestSchema>;

// Node's own JSON loader (no hand JSON.parse, docs/36 Z-2); zod checks what it read.
const load = createRequire(import.meta.url);
const manifest = (root: string, dir: string): Manifest =>
  manifestSchema.parse(load(join(root, dir, 'package.json')));

/** pnpm-workspace.yaml's package folders. */
const WORKSPACE = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];

/**
 * Read besides the packages: what the Dockerfile installs from (lockfile, workspace and npm
 * config, patches, the root manifest, .dockerignore), the compose files and scripts that build
 * and run it (deploy/staging/), and the report PDF's logo in @ab/catalog (pdf-assets.ts LOGO_PATH,
 * read from the file at runtime). Paths ending in `/` are folders.
 */
export const IMAGE_FILES: readonly string[] = [
  '.dockerignore',
  '.npmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'patches/',
  'deploy/staging/',
  'packages/catalog/brand/',
];

/** The workspace's packages by name: { name → folder } (repo-relative). */
export function workspaceDirs(root: string): Map<string, string> {
  const files = globSync(
    WORKSPACE.map((dir) => `${dir}/package.json`),
    { cwd: root },
  );
  return new Map(files.map((file) => [manifest(root, dirname(file)).name, dirname(file)]));
}

const workspaceDeps = (m: Manifest): string[] =>
  Object.entries({ ...m.dependencies, ...m.devDependencies })
    .filter(([, version]) => version.startsWith('workspace:'))
    .map(([name]) => name);

/** The folders of `name` and every workspace package it reaches (sorted). */
export function packageClosure(root: string, name: string): string[] {
  const dirs = workspaceDirs(root);
  const seen = new Set<string>();
  const queue = [name];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const dir = dirs.get(next);
    if (dir === undefined || seen.has(dir)) continue;
    seen.add(dir);
    queue.push(...workspaceDeps(manifest(root, dir)));
  }
  return [...seen].sort();
}

/** Every input of the API image: package folders (with a trailing `/`) and IMAGE_FILES. */
export const apiInputs = (root: string): string[] => [
  ...packageClosure(root, 'api').map((dir) => `${dir}/`),
  ...IMAGE_FILES,
];

const touches = (file: string, input: string): boolean =>
  input.endsWith('/') ? file.startsWith(input) : file === input;

/** The changed files (repo-relative) that are API image inputs. */
export const apiFiles = (changed: readonly string[], inputs: readonly string[]): string[] =>
  changed.filter((file) => inputs.some((input) => touches(file, input)));
