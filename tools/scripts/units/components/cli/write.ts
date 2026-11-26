import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';

// The class-A rules (docs/59 §3) the codemod applies to the text it moved, so moved code never
// carries a suppression to a new path (docs/63 §4 «Class A on moved text»).
const CLASS_A = [
  'typescript/consistent-type-definitions',
  'typescript/consistent-type-imports',
  'eslint/dot-notation',
];

const run = (root: string, cmd: string, args: string[]): void => {
  execFileSync(cmd, args, { cwd: root, stdio: 'pipe', maxBuffer: 256 * 1024 * 1024 });
};

/** oxlint exits 1 while other rules still report; the verification loop's lint judges those. */
const fixClassA = (root: string, paths: string[]): void => {
  const rules = CLASS_A.flatMap((r) => ['-D', r]);
  try {
    run(root, 'pnpm', ['exec', 'oxlint', '--fix', '-A', 'all', ...rules, ...paths]);
  } catch {
    // Remaining diagnostics are the loop's to judge (docs/63 §4 step 4).
  }
};

/** oxlint's class-A fixes, then oxfmt, on the files the codemod wrote. */
export function formatFiles(root: string, paths: string[]): void {
  fixClassA(root, paths);
  run(root, 'pnpm', ['exec', 'oxfmt', ...paths]);
}

/** Writes the planned files, formats them and stages them. */
export function writeFiles(
  root: string,
  files: ReadonlyMap<string, string>,
  format: (root: string, paths: string[]) => void,
): string[] {
  const paths = [...files.keys()].toSorted();
  for (const path of paths) {
    mkdirSync(posix.dirname(posix.join(root, path)), { recursive: true });
    writeFileSync(posix.join(root, path), files.get(path) ?? '');
  }
  if (paths.length === 0) return paths;
  format(root, paths);
  run(root, 'git', ['add', '--', ...paths]);
  return paths;
}

/** Removes the files an adopted hook left (`git rm`, so the move shows as a rename). */
export function removeFiles(root: string, paths: ReadonlySet<string>): string[] {
  const gone = [...paths].toSorted();
  if (gone.length > 0) run(root, 'git', ['rm', '-q', '--', ...gone]);
  return gone;
}
