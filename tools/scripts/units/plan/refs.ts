import { posix } from 'node:path';
import { isCode } from '../scan/files.ts';
import { isPathJson } from '../write/json-paths.ts';

/** Files that name other files by path: a move would leave them pointing at nothing. */
const CONFIG =
  /(?:^|\/)(?:package\.json|tsconfig[^/]*\.json|turbo\.json|knip\.json|[^/]+\.config\.[cm]?[jt]s)$|^\.github\/workflows\/[^/]+\.ya?ml$/;
const PATHLIKE = /[\w@$()[\]./-]+\.[cm]?[jt]sx?(?![\w.])/g;
const REPO_PATH = /^(?:apps|packages|tools|e2e)\//;

const JOINED = /\bjoin\(\s*((?:'[^'\n]*'\s*,\s*)+'[^'\n]*')\s*\)/g;

/** `join('lib', 'x.ts')` → `lib/x.ts`: a path spelled as a join of literals. */
const joinedPath = (args: string): string =>
  args
    .split(',')
    .map((a) => a.trim().slice(1, -1))
    .join('/');

const tokens = (text: string): string[] => [
  ...[...text.matchAll(PATHLIKE)].map((m) => m[0]),
  ...[...text.matchAll(JOINED)].flatMap((m) => tokensOfJoin(m[1] ?? '')),
];

const tokensOfJoin = (args: string): string[] =>
  [...joinedPath(args).matchAll(PATHLIKE)].map((m) => m[0]);

/** Paths a config file names: relative to its folder, or repo paths. */
const configTargets = (file: string, text: string): string[] =>
  tokens(text).flatMap((t) => [posix.join(posix.dirname(file), t), posix.normalize(t)]);

const WORKSPACE = /^(?:apps|packages|tools)\/[^/]+\//;

/** A path spelled from inside a tree (`core/http/x.ts`): neither relative nor a repo path. */
const isTreePath = (t: string): boolean =>
  t.includes('/') && !t.startsWith('.') && !REPO_PATH.test(t);

/** Files of the reader's own workspace by base name, for paths spelled from inside its tree. */
function byNameIn(files: readonly string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const f of files) {
    const key = `${WORKSPACE.exec(f)?.[0] ?? ''}${posix.basename(f)}`;
    out.set(key, [...(out.get(key) ?? []), f]);
  }
  return out;
}

/**
 * Repo paths a code file spells out (in a string, not as a relative import), and the files of
 * its workspace a path spelled from inside the tree ends with (a test that scans its app).
 */
function codeTargets(file: string, text: string, byName: Map<string, string[]>): string[] {
  const all = tokens(text);
  const ws = WORKSPACE.exec(file)?.[0] ?? '';
  const inTree = all.filter(isTreePath).flatMap((t) => {
    const same = byName.get(`${ws}${posix.basename(t)}`) ?? [];
    return ws === '' ? [] : same.filter((f) => f.endsWith(`/${t}`));
  });
  return [...all.filter((t) => REPO_PATH.test(t)), ...inTree];
}

/**
 * File → the other files that name it by path (configs, workflows, tests that read a path).
 * Import specifiers and the baselines a fold renames (write/json-paths.ts) are not counted.
 */
export function pathRefs(
  files: readonly string[],
  read: (file: string) => string,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const byName = byNameIn(files);
  const sources = files.filter(
    (f) => !isPathJson(f) && (CONFIG.test(f) || isCode(posix.basename(f))),
  );
  for (const file of sources) {
    const text = read(file);
    const targets = CONFIG.test(file) ? configTargets(file, text) : codeTargets(file, text, byName);
    const others = [...new Set(targets)].filter((t) => t !== file);
    for (const target of others) out.set(target, [...(out.get(target) ?? []), file]);
  }
  return out;
}
