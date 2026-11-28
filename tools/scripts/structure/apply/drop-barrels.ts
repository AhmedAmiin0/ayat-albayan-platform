import { unlinkSync } from 'node:fs';
import { posix } from 'node:path';
import { readText, writeIfChanged } from '../../ci-checks/move-module/files.ts';
import { loadAliases } from '../../ci-checks/move-module/resolve.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { barrelLines, exportSources } from './barrel-names.ts';
import { redirectFile } from './redirect.ts';

const CODE = /^(?:apps|packages)\/.*\.[cm]?[jt]sx?$/;

export interface Dropped {
  problems: string[];
  /** `[file, target]` imports that went through a dropped barrel (old paths). */
  written: [string, string][];
}

/** Points every import of a dropped barrel at the files behind it, then deletes the barrel. */
export function dropBarrels(
  root: string,
  drops: readonly string[],
  files: readonly string[],
): Dropped {
  const out: Dropped = { problems: [], written: [] };
  if (drops.length === 0) return out;
  const project = newProject();
  const r = { root, aliases: loadAliases(root), renamed: new Map<string, string>() };
  const barrels = new Map(drops.map((d) => [d, exportSources({ project, r }, d)]));
  const read = drops.map((d) => [d, barrelLines({ project, r }, d)] as const);
  const lines = new Map(read.map(([d, l]) => [d, l.lines]));
  out.problems.push(...read.flatMap(([, l]) => l.problems));
  const needles = drops.map((d) => posix.basename(posix.dirname(d)));
  for (const file of files.filter((f) => CODE.test(f) && !drops.includes(f))) {
    const text = readText(root, file);
    if (!needles.some((n) => text.includes(n))) continue;
    const res = redirectFile({ project, r, barrels, lines }, file, text);
    writeIfChanged(root, file, res.text);
    out.problems.push(...res.problems);
    out.written.push(...res.written);
  }
  drops.forEach((d) => unlinkSync(posix.join(root, d)));
  return out;
}
