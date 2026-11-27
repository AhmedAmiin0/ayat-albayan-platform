// A tsconfig names only its own folder (CLAUDE.md rule 13): apps and packages link through
// package.json dependencies and `exports`/`imports`, never through compiler paths; shared compiler
// options come only from the root tsconfig.base.json and its kind configs (packages.mjs), never
// from a package. The one alias, `@/` →
// each app's own src, is declared once in that root base. No baseline and no allow-list: every
// tsconfig.json and tsconfig.*.json outside node_modules passes or CI fails, and so does any `@/`
// import under packages/ (alias.mjs).
// Usage: node tools/scripts/ci-checks/lint/tsconfig/gate.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ts } from 'ts-morph';
import { z } from 'zod';
import { aliasImports, isPackageCode } from './alias.mjs';
import { namesKind, shapeViolations } from './packages.mjs';

const NAME = /(^|\/)tsconfig(\.[^/]+)?\.json$/;
const VENDORED = /(^|\/)node_modules\//;
const WORKSPACE = /^(apps|packages)\//;
const ROOT_BASE = 'tsconfig.base.json';
const ALIAS = { '@/*': ['${configDir}/src/*'] };
const PATHS = `compilerOptions.paths: only ${ROOT_BASE} at the root, exactly ${JSON.stringify(ALIAS)}`;
const LINKS = 'link apps and packages in package.json';

const list = z.array(z.string()).optional();
const schema = z.looseObject({
  extends: z.union([z.string(), z.array(z.string())]).optional(),
  include: list,
  files: list,
  exclude: list,
  compilerOptions: z.looseObject({}).optional(),
});

/** True for a tsconfig.json or tsconfig.*.json path that is not vendored. */
export const isTsconfig = (path) => NAME.test(path) && !VENDORED.test(path);

const leavesFolder = (entry) => {
  const path = posix.normalize(entry);
  return path.startsWith('/') || path === '..' || path.startsWith('../') || WORKSPACE.test(path);
};

const ownFile = (entry) => entry.startsWith('./') && !leavesFolder(entry);
const isRelative = (entry) => entry.startsWith('./') || entry.startsWith('../');
const rootBase = (path, base) =>
  isRelative(base) && posix.join(posix.dirname(path), base) === ROOT_BASE;
const fromRoot = (path, base) => posix.join(posix.dirname(path), base);
const kindBase = (path, base) => isRelative(base) && namesKind(base, fromRoot(path, base));
const allowedBase = (path, base) => ownFile(base) || rootBase(path, base) || kindBase(path, base);

const OPTIONS = ['rootDirs', 'typeRoots', 'baseUrl'];

const forbidden = (config) => {
  const top = Object.hasOwn(config, 'references') ? ['references'] : [];
  const options = OPTIONS.filter((key) => Object.hasOwn(config.compilerOptions ?? {}, key));
  return [...top, ...options.map((key) => `compilerOptions.${key}`)].map((k) => `${k}: ${LINKS}`);
};

const outside = (config) =>
  ['include', 'files', 'exclude'].flatMap((field) =>
    (config[field] ?? [])
      .filter(leavesFolder)
      .map((entry) => `${field}: "${entry}" leaves its own folder`),
  );

const bases = (path, config) =>
  [config.extends ?? []]
    .flat()
    .filter((base) => !allowedBase(path, base))
    .map(
      (base) => `extends: "${base}" is not its own folder, the root ${ROOT_BASE} or a kind config`,
    );

const isTheAlias = (paths, path) => path === ROOT_BASE && isDeepStrictEqual(paths, ALIAS);
const pathsAllowed = (paths, path) => paths === undefined || isTheAlias(paths, path);
const aliasOnlyInBase = (config, path) =>
  pathsAllowed(config.compilerOptions?.paths, path) ? [] : [PATHS];

/** Every way the tsconfig at `path` (its jsonc `text`) names something outside its folder. */
export function violations(path, text) {
  const raw = ts.parseConfigFileTextToJson(path, text);
  const config = schema.parse(raw.error === undefined ? raw.config : undefined);
  return [
    ...forbidden(config),
    ...aliasOnlyInBase(config, path),
    ...outside(config),
    ...bases(path, config),
    ...shapeViolations(path, config),
  ];
}

const report = (label, found) => {
  console.log(`${label}: ${found.length} found`);
  found.forEach((line) => console.log(line));
  return found.length;
};

/** Tracked and untracked, unignored files; the list is past execFileSync's 1 MiB default. */
export function repoFiles(root) {
  const args = ['ls-files', '--cached', '--others', '--exclude-standard'];
  const listed = execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  return [...new Set(listed.split('\n'))].filter((path) => path !== '');
}

function main() {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const files = repoFiles(root);
  const read = (path) => readFileSync(join(root, path), 'utf8');
  const lines = (check) => (path) => check(path, read(path)).map((v) => `  ${path}: ${v}`);
  const configs = files.filter(isTsconfig).sort().flatMap(lines(violations));
  const aliases = files
    .filter(isPackageCode)
    .sort()
    .flatMap(lines((_, text) => aliasImports(text)));
  const total =
    report('tsconfig outside its own folder', configs) + report('@/ in packages', aliases);
  process.exitCode = total === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
