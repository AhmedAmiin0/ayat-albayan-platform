import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import { formatSpec } from '../../../../move-module/resolve.ts';
import { readText } from '../../../../move-module/files.ts';
import { deepImports, type DeepCtx, type DeepImport } from './deep-imports.ts';
import { lineText } from '../barrels/imports.ts';
import { clashes, indexLines, textOf } from './index-lines.ts';

export interface IndexWork {
  /** New text per file: importers pointed at feature indexes, indexes with the names they need. */
  writes: Map<string, string>;
  problems: string[];
  /** Names now re-exported by a feature index. */
  names: string[];
}

const indexOf = (root: string, feature: string): string =>
  existsSync(posix.join(root, feature, 'index.tsx'))
    ? `${feature}/index.tsx`
    : `${feature}/index.ts`;

const specOf = (ctx: DeepCtx, from: string, file: string): string =>
  formatSpec({ file, style: 'index' }, { from, file, aliases: ctx.r.aliases });

function pointAtIndex(
  ctx: DeepCtx,
  file: string,
  uses: DeepImport[],
): { text: string; problems: string[] } {
  const text = readText(ctx.r.root, file);
  const ok = (u: DeepImport): boolean => u.named || u.star;
  const problems = uses.filter((u) => !ok(u)).map((u) => `${file}: cannot split ${u.spec} by name`);
  const seen = new Set<string>();
  const edits = uses
    .filter(ok)
    .map((u) => {
      const spec = specOf(ctx, file, indexOf(ctx.r.root, u.feature));
      const line = lineText({ kind: u.kind, spec, bindings: u.bindings, star: u.star });
      const value = u.star && (seen.has(line) || text.includes(line)) ? '' : line;
      seen.add(line);
      return { start: u.start, end: u.end, value };
    })
    .sort((a, b) => b.start - a.start);
  return {
    text: edits.reduce((acc, e) => acc.slice(0, e.start) + e.value + acc.slice(e.end), text),
    problems,
  };
}

function pointImporters(
  ctx: DeepCtx,
  files: readonly string[],
  work: IndexWork,
): Map<string, DeepImport[]> {
  const found = files.map((file) => ({
    file,
    uses: deepImports(ctx, file, readText(ctx.r.root, file)),
  }));
  const byFeature = new Map<string, DeepImport[]>();
  found.forEach(({ uses }) =>
    uses.forEach((u) => byFeature.set(u.feature, [...(byFeature.get(u.feature) ?? []), u])),
  );
  const clashing = new Map(
    [...byFeature].map(([f, uses]) => [f, clashes(ctx, indexOf(ctx.r.root, f), uses)]),
  );
  const ok = (u: DeepImport): boolean =>
    !u.bindings.some((b) => clashing.get(u.feature)?.has(b.name) === true);
  for (const { file, uses } of found) {
    const kept = uses
      .filter((u) => !ok(u))
      .map((u) => `${file}: kept ${u.spec}, its feature index exports another name`);
    const out = pointAtIndex(ctx, file, uses.filter(ok));
    if (uses.some(ok)) work.writes.set(file, out.text);
    work.problems.push(...out.problems, ...kept);
  }
  return new Map([...byFeature].map(([f, uses]) => [f, uses.filter(ok)]));
}

/** Points the deep imports that the moves made cross-feature at the feature index, and fills it. */
export function fixFeatureIndexes(ctx: DeepCtx, files: readonly string[]): IndexWork {
  const work: IndexWork = { writes: new Map(), problems: [], names: [] };
  for (const [feature, uses] of pointImporters(ctx, files, work)) {
    const index = indexOf(ctx.r.root, feature);
    const lines = indexLines(ctx, index, uses);
    work.names.push(...uses.flatMap((u) => u.bindings.map((b) => b.name)));
    const before = work.writes.get(index) ?? textOf(ctx.r.root, index);
    if (lines.length > 0) work.writes.set(index, `${before}${lines.join('\n')}\n`);
  }
  return work;
}
