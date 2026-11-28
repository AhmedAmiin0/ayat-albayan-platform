import type { Project } from 'ts-morph';
import { formatSpec, resolveSpec, type Resolver } from '../../ci-checks/move-module/resolve.ts';
import type { BarrelLine, Binding, ModuleRef, Source } from './apply.types.ts';
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
  barrels: Map<string, Map<string, Source>>;
  lines: Map<string, BarrelLine[]>;
}

const styleOf = (file: string): 'index' | 'bare' =>
  /\/index\.tsx?$/.test(file) ? 'index' : 'bare';

interface Split {
  ref: ModuleRef;
  names: Map<string, Source>;
}

const specFor = (ctx: Ctx, from: string, target: string): string =>
  formatSpec(
    { file: target, style: styleOf(target) },
    { from, file: target, aliases: ctx.r.aliases },
  );

/** Each binding with the file and name behind it in the barrel. */
function located(split: Split): { src: Source; binding: Binding }[] {
  return split.ref.bindings.flatMap((b) => {
    const src = split.names.get(b.name);
    if (src === undefined) return [];
    const alias = b.alias ?? (src.name === b.name ? undefined : b.name);
    return [{ src, binding: { name: src.name, alias, isType: b.isType } }];
  });
}

function splitRef(ctx: Ctx, file: string, split: Split): Redirect {
  const { ref } = split;
  const missing = ref.bindings.filter((b) => !split.names.has(b.name)).map((b) => b.name);
  if (missing.length > 0) {
    const problems = [`${file}: ${ref.spec} has no ${missing.join(', ')}`];
    return { text: ref.decl.getText(), problems, written: [] };
  }
  const byFile = new Map<string, Binding[]>();
  located(split).forEach(({ src, binding }) =>
    byFile.set(src.file, [...(byFile.get(src.file) ?? []), binding]),
  );
  const lines = [...byFile].map(([target, bindings]) =>
    declText({ kind: kindOf(ref.decl), spec: specFor(ctx, file, target), bindings }),
  );
  return {
    text: lines.join('\n'),
    problems: [],
    written: [...byFile.keys()].map((t) => [file, t]),
  };
}

/** `export * from '<barrel>'` becomes the barrel's own re-exports, seen from `file`. */
function expandStar(ctx: Ctx, file: string, barrel: string): Redirect {
  const lines = ctx.lines.get(barrel) ?? [];
  const text = lines.map((l) =>
    lineText({
      kind: 'export',
      spec: specFor(ctx, file, l.target),
      bindings: l.bindings,
      star: l.star,
    }),
  );
  return { text: text.join('\n'), problems: [], written: lines.map((l) => [file, l.target]) };
}

/** One import of a dropped barrel, rewritten; a default or namespace import is a problem. */
function redirectRef(ctx: Ctx, file: string, ref: ModuleRef): Redirect | undefined {
  const target = resolveSpec(ctx.r, file, ref.spec)?.file ?? '';
  const names = ctx.barrels.get(target);
  if (names === undefined) return undefined;
  if (ref.star) return expandStar(ctx, file, target);
  if (ref.named) return splitRef(ctx, file, { ref, names });
  const problem = `${file}: default, namespace or * use of dropped barrel ${ref.spec}`;
  return { text: ref.decl.getText(), problems: [problem], written: [] };
}

/** The file with every import of a dropped barrel pointed at the files that hold the names. */
export function redirectFile(ctx: Ctx, file: string, text: string): Redirect {
  const sf = ctx.project.createSourceFile(`/virtual/redirect/${file}`, text, { overwrite: true });
  const done = moduleRefs(sf).flatMap((ref) => {
    const out = redirectRef(ctx, file, ref);
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
