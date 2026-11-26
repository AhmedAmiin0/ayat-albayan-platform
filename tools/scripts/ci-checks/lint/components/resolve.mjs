// Check 7: a local hook (`Name/use-*.ts`) is imported only from inside `Name/`. Specifiers are
// resolved for `./`, `../`, `@/` (each workspace's src/) and the kits' `exports` maps.
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { z } from 'zod';
import { parseJson } from '../json-file.mjs';
import { workspaceOf } from './scope.mjs';

const LOCAL_HOOK = /\/[A-Z][^/]*\/use-[^/]+\.ts$/;
const CODE = /\.(?:tsx?|mts)$/;
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

const target = z.union([
  z.string(),
  z.looseObject({ default: z.string() }).transform((entry) => entry.default),
]);
const manifest = z.looseObject({ exports: z.record(z.string(), z.unknown()).optional() });

const pathOf = (value) => target.safeParse(value).data;

const SPEC = /^@ab\/([^/]+)(\/.*)?$/;

/** The package file an `exports` map gives `rest` (`''` is the package root). */
function exported(exports, rest) {
  const exact = pathOf(exports[`.${rest}`]);
  if (rest === '' || exact !== undefined) return exact;
  return pathOf(exports['./*'])?.replace('*', rest.slice(1));
}

function kitBase(tree, spec) {
  const [, pkg = '', rest = ''] = SPEC.exec(spec) ?? [];
  const file = `packages/${pkg}/package.json`;
  if (!tree.has(file)) return undefined;
  const found = exported(parseJson(tree.read(file), manifest).exports ?? {}, rest);
  return found === undefined ? undefined : join(`packages/${pkg}`, found);
}

const BASES = [
  { when: (spec) => spec.startsWith('.'), base: (_t, from, spec) => join(dirname(from), spec) },
  {
    when: (spec) => spec.startsWith('@/'),
    base: (_t, from, spec) => `${workspaceOf(from)}/src/${spec.slice(2)}`,
  },
  { when: (spec) => spec.startsWith('@ab/'), base: (tree, _f, spec) => kitBase(tree, spec) },
];

export function resolveSpec(tree, from, spec) {
  const base = BASES.find(({ when }) => when(spec))?.base(tree, from, spec);
  return base === undefined ? undefined : EXTENSIONS.map((e) => base + e).find((p) => tree.has(p));
}

const isOutside = (hook, from) =>
  hook !== undefined && LOCAL_HOOK.test(hook) && !from.startsWith(`${dirname(hook)}/`);

const hooksImportedBy = (tree, from) =>
  ts
    .preProcessFile(tree.read(from), true, true)
    .importedFiles.map(({ fileName }) => resolveSpec(tree, from, fileName))
    .filter((hook) => isOutside(hook, from));

/** Local hook path → the files outside its folder that import it. */
export function outsideImports(tree) {
  const pairs = tree.paths
    .filter((p) => CODE.test(p))
    .flatMap((from) => hooksImportedBy(tree, from).map((hook) => [hook, from]));
  const grouped = Map.groupBy(pairs, ([hook]) => hook);
  return new Map([...grouped].map(([hook, rows]) => [hook, rows.map(([, from]) => from)]));
}
