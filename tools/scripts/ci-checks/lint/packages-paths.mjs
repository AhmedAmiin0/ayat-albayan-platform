// Path literals that reach into another workspace's folder (check 3): code that reads another
// package's files by path depends on it as surely as an import does.
import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { ts } from 'ts-morph';
import { z } from 'zod';

const GLOB = /[*?{[]/;
const ROOT_RELATIVE = /(?:^|\/)((apps|packages|tools)\/[^/]+)(\/.*)$/;
const ROOT_DIR = '<rootDir>/';

/** The config files whose strings are paths (turbo.json is not: its paths are task inputs). */
export const CONFIG = /(^|\/)(tsconfig[^/]*\.json|app\.json|eas\.json)$/;

const fromFile = (file, lit) => posix.join(posix.dirname(file), lit);

/** First match wins: `../` from the file, `<rootDir>/`, a root-relative workspace path. */
const STRATEGIES = [
  { test: (lit) => lit.startsWith('../'), path: (file, lit) => fromFile(file, lit) },
  {
    test: (lit) => lit.startsWith(ROOT_DIR),
    path: (f, lit) => fromFile(f, lit.slice(ROOT_DIR.length)),
  },
  {
    test: (lit, at) => at.atDir(ROOT_RELATIVE.exec(lit)?.[1] ?? '') !== undefined,
    path: rootRelative,
  },
];

function rootRelative(_file, lit) {
  const m = ROOT_RELATIVE.exec(lit);
  return m === null ? '.' : `${m[1]}${m[3]}`;
}

const beforeGlob = (path) => {
  const parts = path.split('/');
  const cut = parts.findIndex((p) => GLOB.test(p));
  return posix.normalize(parts.slice(0, cut < 0 ? parts.length : cut).join('/') || '.');
};

/** The workspace `lit` (in `file`) lands in, when it is an existing path in some workspace. */
export function landing({ root, at, file }, lit) {
  const strategy = STRATEGIES.find((s) => s.test(lit, at));
  const path = strategy === undefined ? '.' : beforeGlob(strategy.path(file, lit));
  const real = !path.startsWith('..') && path !== '.' && existsSync(join(root, path));
  return real ? at.owner(path) : undefined;
}

const list = z.array(z.string()).optional();
const tsconfig = z.looseObject({
  extends: z.union([z.string(), z.array(z.string())]).optional(),
  files: list,
  include: list,
  references: z.array(z.looseObject({ path: z.string() })).optional(),
  compilerOptions: z
    .looseObject({ paths: z.record(z.string(), z.array(z.string())).optional() })
    .optional(),
});

const tsconfigStrings = (raw) => {
  const c = tsconfig.parse(raw);
  const refs = (c.references ?? []).map((r) => r.path);
  const paths = Object.values(c.compilerOptions?.paths ?? {}).flat();
  return [[c.extends ?? []].flat(), c.files ?? [], c.include ?? [], refs, paths].flat();
};

const nested = z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).catch([]);

/** Every string value in a JSON tree. */
const leaves = (value) => {
  const s = z.string().safeParse(value);
  return s.success ? [s.data] : Object.values(nested.parse(value)).flatMap(leaves);
};

/** The path strings of a config file: a tsconfig's path fields, every string of app/eas.json. */
export function configStrings(path, text) {
  const raw = ts.parseConfigFileTextToJson(path, text).config;
  return posix.basename(path).startsWith('tsconfig') ? tsconfigStrings(raw) : leaves(raw);
}
