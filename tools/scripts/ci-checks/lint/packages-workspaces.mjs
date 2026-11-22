// The workspaces of a tree (pnpm-workspace.yaml, named by package.json) and the resolution of a
// module specifier or a path to the workspace it lands in.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { readJson } from './json-file.mjs';

const workspaceFile = z.looseObject({ packages: z.array(z.string()) });
const deps = z.record(z.string(), z.string()).optional();
const manifest = z.looseObject({
  name: z.string(),
  dependencies: deps,
  devDependencies: deps,
  peerDependencies: deps,
  optionalDependencies: deps,
});

const NAMED = /^(@ab\/[a-z0-9-]+|[a-z0-9-]+)(?:\/|$)/;

const subdirs = (root, dir) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => `${dir}/${e.name}`)
    : [];

const expand = (root, glob) => (glob.endsWith('/*') ? subdirs(root, glob.slice(0, -2)) : [glob]);

/** `[{ dir, name, manifest }]`, deepest folder first so a nested workspace wins its paths. */
export function workspaces(root) {
  const text = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const globs = workspaceFile.parse(parse(text)).packages;
  return globs
    .flatMap((g) => expand(root, g))
    .filter((dir) => existsSync(join(root, dir, 'package.json')))
    .map((dir) => ({ dir, manifest: readJson(join(root, dir, 'package.json'), manifest) }))
    .map(({ dir, manifest: m }) => ({ dir, name: m.name, manifest: m }))
    .sort((a, b) => b.dir.length - a.dir.length);
}

const inside = (path, dir) => path === dir || path.startsWith(`${dir}/`);

/** Lookups over `list`: the owner of a repo path, of a specifier, of a dir. */
export function resolver(list) {
  const byName = new Map(list.map((w) => [w.name, w.name]));
  const byDir = new Map(list.map((w) => [w.dir, w.name]));
  const owner = (path) => list.find((w) => inside(path, w.dir))?.name;
  const named = (spec) => byName.get(NAMED.exec(spec)?.[1] ?? '');
  const relative = (file, spec) => owner(posix.join(posix.dirname(file), spec));
  const spec = (file, s) => (s.startsWith('.') ? relative(file, s) : named(s));
  return { owner, spec, atDir: (dir) => byDir.get(dir) };
}
