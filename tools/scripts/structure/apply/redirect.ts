import type { Project } from 'ts-morph';
import { formatSpec, resolveSpec, type Resolver } from '../../ci-checks/move-module/resolve.ts';
import type { Binding, ModuleRef, Pruned, Source } from './apply.types.ts';
import { declText, kindOf, lineText, moduleRefs } from './imports.ts';

export interface Redirect {
  text: string;
  problems: string[];
  /** `[file, target]` imports written by the redirect: they reached an index before. */
  written: [string, string][];
}

interface Ctx {
  project: Project;
  r: Resolver;
  barrels: Map<string, Pruned>;
}

const styleOf = (file: string): 'index' | 'bare' =>
  /\/index\.tsx?$/.test(file) ? 'index' : 'bare';

const specFor = (ctx: Ctx, from: string, target: string): string =>
  target.startsWith('pkg:')
    ? target.slice(4)
    : formatSpec(
        { file: target, style: styleOf(target) },
        { from, file: target, aliases: ctx.r.aliases },
      );

interface Split {
  ref: ModuleRef;
  pruned: Pruned;
}

/** Foreign bindings by the file behind them; the rest stay on the barrel (or its package). */
function locate(split: Split): { byFile: Map<string, Binding[]>; rest: Binding[] } {
  const byFile = new Map<string, Binding[]>();
  const rest: Binding[] = [];
  for (const b of split.ref.bindings) {
    const src: Source | undefined = split.pruned.names.get(b.name);
    const alias = b.alias ?? (src === undefined || src.name === b.name ? undefined : b.name);
    const moved = { name: src?.name ?? b.name, alias, isType: b.isType };
    if (src === undefined) rest.push(b);
    else byFile.set(src.file, [...(byFile.get(src.file) ?? []), moved]);
  }
  return { byFile, rest };
}

function splitRef(ctx: Ctx, file: string, split: Split): Redirect {
  const { ref, pruned } = split;
  const { byFile, rest } = locate(split);
  const restSpec = pruned.kept ? ref.spec : pruned.external;
  const lost = rest.length > 0 && restSpec === undefined;
  const kind = kindOf(ref.decl);
  const lines = [...byFile].map(([target, bindings]) =>
    declText({ kind, spec: specFor(ctx, file, target), bindings }),
  );
  const kept = rest.length > 0 && restSpec !== undefined;
  const restLine = kept ? [declText({ kind, spec: restSpec, bindings: rest })] : [];
  return {
    text: [...restLine, ...lines].join('\n'),
    problems: lost ? [`${file}: ${ref.spec} has no ${rest.map((b) => b.name).join(', ')}`] : [],
    written: [...byFile.keys()].map((t) => [file, t]),
  };
}

const MAX_NEST = 6;

/** A foreign line as seen from `file`; a line into another pruned barrel opens that one too. */
function foreignLines(ctx: Ctx, file: string, at: { pruned: Pruned; depth: number }): string[] {
  return at.pruned.foreign.flatMap((l) => {
    const inner = l.star ? ctx.barrels.get(l.target) : undefined;
    if (inner !== undefined && at.depth < MAX_NEST) {
      const own = inner.kept
        ? [
            lineText({
              kind: 'export',
              spec: specFor(ctx, file, l.target),
              bindings: [],
              star: true,
            }),
          ]
        : [];
      return [...own, ...foreignLines(ctx, file, { pruned: inner, depth: at.depth + 1 })];
    }
    return [
      lineText({
        kind: 'export',
        spec: specFor(ctx, file, l.target),
        bindings: l.bindings,
        star: l.star,
      }),
    ];
  });
}

/** `export * from '<barrel>'` gains the barrel's foreign re-exports, seen from `file`. */
function expandStar(ctx: Ctx, file: string, split: Split & { text: string }): Redirect {
  const { pruned, ref } = split;
  const own = pruned.kept ? [ref.decl.getText()] : [];
  const moved = foreignLines(ctx, file, { pruned, depth: 0 }).filter(
    (l) => !split.text.includes(l),
  );
  const written = pruned.foreign.filter((l) => !l.target.startsWith('pkg:'));
  return {
    text: [...own, ...new Set(moved)].join('\n'),
    problems: [],
    written: written.map((l) => [file, l.target]),
  };
}

/** One import of a pruned barrel, rewritten; a default or namespace import of a gone one fails. */
function redirectRef(
  ctx: Ctx,
  file: string,
  at: { ref: ModuleRef; text: string },
): Redirect | undefined {
  const { ref } = at;
  const pruned = ctx.barrels.get(resolveSpec(ctx.r, file, ref.spec)?.file ?? '');
  if (pruned === undefined) return undefined;
  if (ref.star) return expandStar(ctx, file, { ref, pruned, text: at.text });
  if (ref.named) return splitRef(ctx, file, { ref, pruned });
  const problems = pruned.kept ? [] : [`${file}: default or namespace use of ${ref.spec}`];
  return { text: ref.decl.getText(), problems, written: [] };
}

/** The file with every import of a pruned barrel pointed at the files that hold the names. */
export function redirectFile(ctx: Ctx, file: string, text: string): Redirect {
  const sf = ctx.project.createSourceFile(`/virtual/redirect/${file}`, text, { overwrite: true });
  const done = moduleRefs(sf).flatMap((ref) => {
    const out = redirectRef(ctx, file, { ref, text });
    return out === undefined ? [] : [{ start: ref.decl.getStart(), end: ref.decl.getEnd(), out }];
  });
  ctx.project.removeSourceFile(sf);
  const sorted = [...done].sort((a, b) => b.start - a.start);
  return {
    text: sorted.reduce((acc, e) => acc.slice(0, e.start) + e.out.text + acc.slice(e.end), text),
    problems: done.flatMap((d) => d.out.problems),
    written: done.flatMap((d) => d.out.written),
  };
}
