import { foldersOf } from './folders.ts';

const repeats = (dir: string): boolean =>
  dir.split('/').some((s, i, all) => i > 0 && all[i - 1] === s);

/** A folder the moves nest inside a namesake (`shared/shared`, `tabs/tabs`) that was not there. */
export function nestingProblems(before: readonly string[], after: readonly string[]): string[] {
  const old = foldersOf(before);
  return [...foldersOf(after)]
    .filter((d) => repeats(d) && !old.has(d))
    .sort()
    .map((d) => `double-nested folder: ${d}`);
}
