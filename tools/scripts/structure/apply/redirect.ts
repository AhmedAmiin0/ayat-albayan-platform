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

const styleOf = (file: string): 'index' | 'bare' => (/\/index\.tsx?$/.test(file) ? 'index' : 'bare');

function splitRef(ctx: Ctx, file: string, ref: ModuleRef, names: Map<string, Source>): Redirect {
  const missing = ref.bindings.filter((b) => !names.has(b.name)).map((b) => b.name);
  if (missing.length > 0) {
    return { text: ref.decl.getText(), problems: [`${file}: ${ref.spec} has no ${missing.join(', ')}`], written: [] };
  }
  const byFile = new Map<string, Binding[]>();
  for (const b of ref.bindings) {
    const src = names.get(b.name) as Source;
    const alias = b.alias ?? (src.name === b.name ? undefined : b.name);
    byFile.set(src.file, [...(byFile.get(src.file) ?? []), { name: src.name, alias, isType: b.isType }]);
  }
  const lines = [...byFile].map(([target, bindings]) => {
    const spec = formatSpec({ file: target, style: styleOf(target) }, { from: file, file: target, aliases: ctx.r.aliases });
    return declText({ kind: kindOf(ref.decl), spec, bindings });
  });
  return { text: lines.join('\n'), problems: [], written: [...byFile.keys()].map((t) => [file, t]) };
}

/** `export * from '<barrel>'` becomes the barrel's own re-exports, seen from `file`. */
function expandStar(ctx: Ctx, file: string, barrel: string): Redirect {
  const lines = ctx.lines.get(barrel) ?? [];
  const text = lines.map((l) => {
    const spec = formatSpec({ file: l.target, style: styleOf(l.target) }, { from: file, file: l.target, aliases: ctx.r.aliases });
    return lineText({ kind: 'export', spec, bindings: l.bindings, star: l.star });
  });
  return { text: text.join('\n'), problems: [], written: lines.map((l) => [file, l.target]) };
}

/** The file with every import of a dropped barrel pointed at the files that hold the names. */
export function redirectFile(ctx: Ctx, file: string, text: string): Redirect {
  const sf = ctx.project.createSourceFile(`/virtual/redirect/${file}`, text, { overwrite: true });
  const out: Redirect = { text, problems: [], written: [] };
  const edits: { start: number; end: number; value: string }[] = [];
  for (const ref of moduleRefs(sf)) {
    const target = resolveSpec(ctx.r, file, ref.spec)?.file;
    const names = target === undefined ? undefined : ctx.barrels.get(target);
    if (names === undefined) continue;
    if (!ref.named && !ref.star) {
      out.problems.push(`${file}: default, namespace or * use of dropped barrel ${ref.spec}`);
      continue;
    }
    const split = ref.star ? expandStar(ctx, file, target ?? '') : splitRef(ctx, file, ref, names);
    out.problems.push(...split.problems);
    out.written.push(...split.written);
    edits.push({ start: ref.decl.getStart(), end: ref.decl.getEnd(), value: split.text });
  }
  ctx.project.removeSourceFile(sf);
  const sorted = edits.sort((a, b) => b.start - a.start);
  out.text = sorted.reduce((acc, e) => acc.slice(0, e.start) + e.value + acc.slice(e.end), text);
  return out;
}
