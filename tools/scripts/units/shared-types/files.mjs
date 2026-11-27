// Which files the inventory reads, and the workspace a path or an import specifier belongs to.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

const SOURCE = /^(?:apps|packages)\/[^/]+\/src\/.+\.tsx?$/;
const SKIPPED = [/\.(?:test|spec)\.tsx?$/, /\/(?:tests|test|testing)\//, /\.d\.ts$/, /\.gen\.ts$/];
const WORKSPACE = /^((?:apps|packages)\/[^/]+)\//;
const DOMAINS = new Set([
  'finance',
  'messaging',
  'people',
  'platform',
  'reporting',
  'sales',
  'teaching',
]);

export const isScanned = (path) => SOURCE.test(path) && !SKIPPED.some((re) => re.test(path));

export const workspaceOf = (path) => WORKSPACE.exec(path)?.[1] ?? null;

const resolvers = [
  [(spec) => spec.startsWith('@ab/'), (spec) => `packages/${spec.split('/')[1]}`],
  [(spec) => spec.startsWith('@/'), (_, from) => workspaceOf(from)],
  [(spec) => spec.startsWith('.'), (spec, from) => workspaceOf(posix.join(dirname(from), spec))],
];

/** The workspace an import specifier written in `from` reads, or null for an outside package. */
export function targetOf(spec, from) {
  const found = resolvers.find(([accepts]) => accepts(spec));
  return found ? found[1](spec, from) : null;
}

/** The first path segment that names a domain (docs/62 part 1 §1), or null. */
export const domainOf = (path) => path.split('/').find((part) => DOMAINS.has(part)) ?? null;

/** path → text of every scanned file git knows in `cwd`, tracked or new, in path order. */
export function readTree(cwd) {
  const listed = execFileSync(
    'git',
    ['ls-files', '-co', '--exclude-standard', '-z', '--', 'apps', 'packages'],
    {
      cwd,
      maxBuffer: 1024 * 1024 * 1024,
    },
  );
  const paths = listed.toString('utf8').split('\0').filter(isScanned).toSorted();
  return new Map(paths.map((path) => [path, readFileSync(join(cwd, path), 'utf8')]));
}
