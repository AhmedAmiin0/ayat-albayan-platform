import { posix } from 'node:path';
import type { Project } from 'ts-morph';
import { resolveSpec, type Resolver } from '../../../../move-module/resolve.ts';
import { readText } from '../../../../move-module/files.ts';
import type { BarrelLine, ModuleRef, Source } from '../apply.types.ts';
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
  const deeper = exportSources(ctx, target, at.depth + 1);
  return at.ref.bindings.map((b) => [
    b.alias ?? b.name,
    { ...(deeper.get(b.name) ?? { file: target, name: b.name }), typeOnly: b.isType },
  ]);
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

const isPackage = (spec: string): boolean => !spec.startsWith('.') && !spec.startsWith('@/');

function lineOf(ctx: Ctx, barrel: string, ref: ModuleRef): BarrelLine[] {
  const found = resolveSpec(ctx.r, barrel, ref.spec)?.file;
  const target = found ?? (isPackage(ref.spec) ? `pkg:${ref.spec}` : undefined);
  if (target === undefined) return [];
  const span = { start: ref.decl.getStart(), end: ref.decl.getEnd() };
  return [{ target, bindings: ref.bindings, star: ref.star, ...span }];
}

/** A barrel's re-exports with their files and spans, and the count of its other statements. */
export function barrelLines(ctx: Ctx, barrel: string): { lines: BarrelLine[]; own: number } {
  const text = readText(ctx.r.root, barrel);
  const sf = ctx.project.createSourceFile(`/virtual/lines/${barrel}`, text, { overwrite: true });
  const refs = moduleRefs(sf).filter((x) => x.decl.getKindName() === 'ExportDeclaration');
  const lines = refs.flatMap((ref) => lineOf(ctx, barrel, ref));
  const own = sf.getStatements().length - lines.length;
  ctx.project.removeSourceFile(sf);
  return { lines, own };
}

/** The names one barrel line exports, with the file that holds each. */
export function lineNames(ctx: Ctx, line: BarrelLine): [string, Source][] {
  if (line.target.startsWith('pkg:')) return [];
  if (line.star) return [...exportSources(ctx, line.target)];
  return line.bindings.map((b) => [b.alias ?? b.name, { file: line.target, name: b.name }]);
}
