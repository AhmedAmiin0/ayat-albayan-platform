import { unlinkSync } from 'node:fs';
import { posix } from 'node:path';
import { readText, writeIfChanged } from '../../../../move-module/files.ts';
import { loadAliases } from '../../../../move-module/resolve.ts';
import { newProject } from '../../../../move-module/rewrite.ts';
import { prunedText, prunePlan, type Place } from './prune.ts';
import { redirectFile } from './redirect.ts';

const CODE = /^(?:apps|packages)\/.*\.[cm]?[jt]sx?$/;

export interface Dropped {
  problems: string[];
  /** `[file, target]` imports that went through a pruned barrel (old paths). */
  written: [string, string][];
  /** Barrels deleted because nothing of their own was left. */
  deleted: string[];
}

/**
 * Prunes each listed barrel to the re-exports of its own feature (after the moves), points their
 * importers at the files behind the removed names, and deletes a barrel left empty.
 */
export function dropBarrels(
  root: string,
  drops: readonly string[],
  at: { files: readonly string[]; place: Place },
): Dropped {
  const out: Dropped = { problems: [], written: [], deleted: [] };
  const project = newProject();
  const r = { root, aliases: loadAliases(root), renamed: new Map<string, string>() };
  const barrels = new Map(drops.map((d) => [d, prunePlan({ project, r }, d, at.place)]));
  const needles = drops.map((d) => posix.basename(posix.dirname(d)));
  for (const file of at.files.filter((f) => CODE.test(f) && !barrels.has(f))) {
    const text = readText(root, file);
    if (!needles.some((n) => text.includes(n))) continue;
    const res = redirectFile({ project, r, barrels }, file, text);
    writeIfChanged(root, file, res.text);
    out.problems.push(...res.problems);
    out.written.push(...res.written);
  }
  for (const [barrel, pruned] of barrels) {
    if (pruned.kept) writeIfChanged(root, barrel, prunedText(readText(root, barrel), pruned));
    else unlinkSync(posix.join(root, barrel));
    if (!pruned.kept) out.deleted.push(barrel);
  }
  return out;
}
