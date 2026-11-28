import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import { formatSpec } from '../../ci-checks/move-module/resolve.ts';
import { readText } from '../../ci-checks/move-module/files.ts';
import type { Binding } from './apply.types.ts';
import { exportSources } from './barrel-names.ts';
import { deepImports, type DeepCtx, type DeepImport } from './deep-imports.ts';
import { declText, lineText } from './imports.ts';

export interface IndexWork {
  /** New text per file: importers pointed at feature indexes, indexes with the names they need. */
  writes: Map<string, string>;
  problems: string[];
}

const indexOf = (root: string, feature: string): string =>
  existsSync(posix.join(root, feature, 'index.tsx')) ? `${feature}/index.tsx` : `${feature}/index.ts`;

const specOf = (ctx: DeepCtx, from: string, file: string): string =>
  formatSpec({ file, style: 'index' }, { from, file, aliases: ctx.r.aliases });

const relSpec = (index: string, target: string): string => {
  const rel = posix.relative(posix.dirname(index), target).replace(/(\/index)?\.[cm]?[jt]sx?$/, '');
  return rel.startsWith('.') ? rel : `./${rel}`;
};

/** Lines to append to a feature index so it exports what its outside importers use. */
function indexLines(ctx: DeepCtx, index: string, uses: DeepImport[]): { lines: string[]; problems: string[] } {
  const has = existsSync(posix.join(ctx.r.root, index)) ? exportSources(ctx, index) : new Map();
  const add = new Map<string, Binding[]>();
  const problems: string[] = [];
  for (const use of uses.filter((u) => u.named)) {
    for (const b of use.bindings) {
      const now = has.get(b.name);
      if (now !== undefined && now.file !== use.target) problems.push(`${index} already exports another ${b.name}`);
      if (now !== undefined) continue;
      has.set(b.name, { file: use.target, name: b.name });
      add.set(use.target, [...(add.get(use.target) ?? []), { name: b.name, isType: b.isType }]);
    }
  }
  const named = [...add].map(([target, bindings]) => declText({ kind: 'export', spec: relSpec(index, target), bindings }));
  const text = existsSync(posix.join(ctx.r.root, index)) ? readText(ctx.r.root, index) : '';
  const stars = [...new Set(uses.filter((u) => u.star).map((u) => `export * from '${relSpec(index, u.target)}';`))];
  return { lines: [...named, ...stars.filter((l) => !text.includes(l))], problems };
}

function pointAtIndex(ctx: DeepCtx, file: string, uses: DeepImport[]): { text: string; problems: string[] } {
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
  return { text: edits.reduce((acc, e) => acc.slice(0, e.start) + e.value + acc.slice(e.end), text), problems };
}

/** Points the deep imports that the moves made cross-feature at the feature index, and fills it. */
export function fixFeatureIndexes(ctx: DeepCtx, files: readonly string[]): IndexWork {
  const work: IndexWork = { writes: new Map(), problems: [] };
  const byFeature = new Map<string, DeepImport[]>();
  for (const file of files) {
    const uses = deepImports(ctx, file, readText(ctx.r.root, file));
    if (uses.length === 0) continue;
    uses.forEach((u) => byFeature.set(u.feature, [...(byFeature.get(u.feature) ?? []), u]));
    const out = pointAtIndex(ctx, file, uses);
    work.writes.set(file, out.text);
    work.problems.push(...out.problems);
  }
  for (const [feature, uses] of byFeature) {
    const index = indexOf(ctx.r.root, feature);
    const { lines, problems } = indexLines(ctx, index, uses);
    const before = work.writes.get(index) ?? (existsSync(posix.join(ctx.r.root, index)) ? readText(ctx.r.root, index) : '');
    if (lines.length > 0) work.writes.set(index, `${before}${lines.join('\n')}\n`);
    work.problems.push(...problems);
  }
  return work;
}
