import { posix } from 'node:path';
import { isCode } from '../scan/files.ts';
import { isPathJson } from '../write/json-paths.ts';

/** Files that name other files by path: a move would leave them pointing at nothing. */
const CONFIG =
  /(?:^|\/)(?:package\.json|tsconfig[^/]*\.json|turbo\.json|knip\.json|[^/]+\.config\.[cm]?[jt]s)$|^\.github\/workflows\/[^/]+\.ya?ml$/;
const PATHLIKE = /[\w@$()[\]./-]+\.[cm]?[jt]sx?(?![\w.])/g;
const REPO_PATH = /^(?:apps|packages|tools|e2e)\//;

const tokens = (text: string): string[] => [...text.matchAll(PATHLIKE)].map((m) => m[0]);

/** Paths a config file names: relative to its folder, or repo paths. */
const configTargets = (file: string, text: string): string[] =>
  tokens(text).flatMap((t) => [posix.join(posix.dirname(file), t), posix.normalize(t)]);

/** Repo paths a code file spells out (in a string, not as a relative import). */
const codeTargets = (text: string): string[] => tokens(text).filter((t) => REPO_PATH.test(t));

/**
 * File → the other files that name it by path (configs, workflows, tests that read a path).
 * Import specifiers and the baselines a fold renames (write/json-paths.ts) are not counted.
 */
export function pathRefs(
  files: readonly string[],
  read: (file: string) => string,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const sources = files.filter(
    (f) => !isPathJson(f) && (CONFIG.test(f) || isCode(posix.basename(f))),
  );
  for (const file of sources) {
    const text = read(file);
    const targets = CONFIG.test(file) ? configTargets(file, text) : codeTargets(text);
    const others = [...new Set(targets)].filter((t) => t !== file);
    for (const target of others) out.set(target, [...(out.get(target) ?? []), file]);
  }
  return out;
}
