// A tsconfig names only its own folder (CLAUDE.md rule 13): apps and packages link through
// package.json dependencies and `exports`/`imports`, never through compiler paths; shared compiler
// options come only from the root tsconfig.base.json, never from a package. No baseline and no
// allow-list: every tsconfig.json and tsconfig.*.json outside node_modules passes or CI fails.
// `compilerOptions.paths` is left to its own lane until no tsconfig has it.
// Usage: node tools/scripts/ci-checks/lint/tsconfig/gate.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ts } from 'ts-morph';
import { z } from 'zod';

const NAME = /(^|\/)tsconfig(\.[^/]+)?\.json$/;
const VENDORED = /(^|\/)node_modules\//;
const WORKSPACE = /^(apps|packages)\//;
const ROOT_BASE = 'tsconfig.base.json';
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
const allowedBase = (path, base) => ownFile(base) || rootBase(path, base);

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
    .map((base) => `extends: "${base}" is not its own folder or the root ${ROOT_BASE}`);

/** Every way the tsconfig at `path` (its jsonc `text`) names something outside its folder. */
export function violations(path, text) {
  const raw = ts.parseConfigFileTextToJson(path, text);
  const config = schema.parse(raw.error === undefined ? raw.config : undefined);
  return [...forbidden(config), ...outside(config), ...bases(path, config)];
}

function main() {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const args = ['ls-files', '--cached', '--others', '--exclude-standard'];
  const files = execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n');
  const configs = [...new Set(files.filter(isTsconfig))].sort();
  const found = configs.flatMap((path) =>
    violations(path, readFileSync(join(root, path), 'utf8')).map((v) => `  ${path}: ${v}`),
  );
  console.log(`tsconfig: ${configs.length} files, ${found.length} outside their own folder`);
  found.forEach((line) => console.log(line));
  process.exitCode = found.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
