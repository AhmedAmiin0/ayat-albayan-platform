// The bundle compiles workspace packages from their TypeScript source, so the image needs no
// package dist: a package export `./dist/<x>.js` is read from `./src/<x>.ts`.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { manifestSchema, readManifest } from './manifest.mjs';

const WORKSPACE_ID = /^(@ab\/[^/]+)(\/.+)?$/;

/** @param {unknown} manifest a package.json @param {string} subpath */
export function sourceEntry(manifest, subpath) {
  const entry = manifestSchema.parse(manifest).exports?.[subpath];
  return entry?.replace(/^\.\/dist\//, './src/').replace(/\.js$/, '.ts') ?? null;
}

function readPackages(packagesDir) {
  const manifests = readdirSync(packagesDir)
    .map((dir) => join(packagesDir, dir))
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .map((dir) => ({ dir, manifest: readManifest(dir) }));
  return new Map(manifests.map((pkg) => [pkg.manifest.name, pkg]));
}

/** A resolver that sends `@ab/<name>[/<subpath>]` to the package's source file. */
export function workspaceSource(packagesDir) {
  const packages = readPackages(packagesDir);
  const resolveId = (id) => {
    const [, name, subpath = ''] = WORKSPACE_ID.exec(id) ?? [];
    const pkg = packages.get(name);
    const entry = pkg && sourceEntry(pkg.manifest, `.${subpath}`);
    return entry ? join(pkg.dir, entry) : null;
  };
  return { name: 'workspace-source', resolveId };
}
