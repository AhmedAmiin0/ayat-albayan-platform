import { posix } from 'node:path';
import type { Project } from 'ts-morph';
import { resolveSpec, type Resolver } from '../../ci-checks/move-module/resolve.ts';
import { readText } from '../../ci-checks/move-module/files.ts';
import type { BarrelLine, ModuleRef, Source } from './apply.types.ts';
import { moduleRefs } from './imports.ts';

interface Ctx {
  project: Project;
  r: Resolver;
}

const MAX_DEPTH = 8;

function localNames(ctx: Ctx, file: string): string[] {
  const sf = ctx.project.createSourceFile(`/virtual/${file}`, readText(ctx.r.root, file), {
    overwrite: true,
  });
  const names = [...sf.getExportedDeclarations().keys()].filter((n) => n !== 'default');
  ctx.project.removeSourceFile(sf);
  return names;
}

/** The names one re-export brings: its bindings, or for `export *` all of its module's. */
function reExported(
  ctx: Ctx,
  at: { file: string; ref: ModuleRef; depth: number },
): [string, Source][] {
  const target = resolveSpec(ctx.r, at.file, at.ref.spec)?.file;
  if (target === undefined) return [];
  if (at.ref.bindings.length === 0) return [...exportSources(ctx, target, at.depth + 1)];
  return at.ref.bindings.map((b) => [b.alias ?? b.name, { file: target, name: b.name }]);
}

/** What a module exports by name, with the file that declares each name (through barrels). */
export function exportSources(ctx: Ctx, file: string, depth = 0): Map<string, Source> {
  const out = new Map<string, Source>();
  if (depth > MAX_DEPTH) return out;
  localNames(ctx, file).forEach((name) => out.set(name, { file, name }));
  const sf = ctx.project.createSourceFile(`/virtual/re/${file}`, readText(ctx.r.root, file), {
    overwrite: true,
  });
  const refs = moduleRefs(sf).filter((x) => x.decl.getKindName() === 'ExportDeclaration');
  for (const ref of refs) reExported(ctx, { file, ref, depth }).forEach(([k, v]) => out.set(k, v));
  ctx.project.removeSourceFile(sf);
  return out;
}

export const stem = (file: string): string => posix.basename(file).replace(/\.[cm]?[jt]sx?$/, '');

/** A barrel's re-exports with their files; a barrel that declares code of its own is a problem. */
export function barrelLines(ctx: Ctx, barrel: string): { lines: BarrelLine[]; problems: string[] } {
  const sf = ctx.project.createSourceFile(
    `/virtual/lines/${barrel}`,
    readText(ctx.r.root, barrel),
    {
      overwrite: true,
    },
  );
  const refs = moduleRefs(sf).filter((x) => x.decl.getKindName() === 'ExportDeclaration');
  const own = sf
    .getStatements()
    .filter((s) => !['ExportDeclaration', 'ImportDeclaration'].includes(s.getKindName()));
  const lines = refs.flatMap((ref) => {
    const target = resolveSpec(ctx.r, barrel, ref.spec)?.file;
    return target === undefined ? [] : [{ target, bindings: ref.bindings, star: ref.star }];
  });
  ctx.project.removeSourceFile(sf);
  return {
    lines,
    problems: own.length > 0 ? [`dropped barrel ${barrel} declares code of its own`] : [],
  };
}
