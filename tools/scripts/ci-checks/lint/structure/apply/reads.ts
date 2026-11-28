import { readText, writeIfChanged } from '../../../move-module/files.ts';
import { applyEdits, pathFixes } from '../tree/files/paths.ts';
import type { Moves } from '../tree/tree.types.ts';

const CODE = /^(?:apps|packages)\/.*\.[cm]?[jt]sx?$/;

/** Rewrites relative reads the moves would break (before moving); returns what it cannot fix. */
export function fixReads(root: string, ctx: { files: readonly string[]; moves: Moves }): string[] {
  const sources = ctx.files
    .filter((f) => CODE.test(f))
    .map((file) => ({ file, text: readText(root, file) }));
  const fixes = pathFixes(sources, ctx.moves);
  fixes.edits.forEach((edits, file) =>
    writeIfChanged(root, file, applyEdits(readText(root, file), edits)),
  );
  return fixes.problems;
}
