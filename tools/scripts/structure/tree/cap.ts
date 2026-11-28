import { countUnder } from './folders.ts';
import type { FolderCount } from './tree.types.ts';

const MAX = 12;
const crowded = (c: FolderCount): boolean => c.files > MAX || c.dirs > MAX;
const grew = (c: FolderCount, ok: FolderCount): boolean => c.files > ok.files || c.dirs > ok.dirs;

/** Folders over 12 code files or 12 sub-folders that the folder-cap allow-lists do not cover. */
export function capProblems(
  files: readonly string[],
  scan: { roots: readonly string[]; allow: Readonly<Record<string, FolderCount>> },
): string[] {
  return scan.roots.flatMap((root) =>
    [...countUnder(files, root)].flatMap(([dir, c]) => {
      if (!crowded(c)) return [];
      const ok = scan.allow[dir];
      if (ok !== undefined && !grew(c, ok)) return [];
      return [`over the folder cap: ${dir} has ${c.files} code files, ${c.dirs} folders`];
    }),
  );
}
