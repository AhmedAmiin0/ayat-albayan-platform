import { existsSync } from 'node:fs';
import { posix } from 'node:path';
import { readText } from '../../../../move-module/files.ts';
import type { Binding, Source } from '../apply.types.ts';
import { exportSources } from '../barrels/barrel-names.ts';
import { declText } from '../barrels/imports.ts';
import type { DeepCtx, DeepImport } from './deep-imports.ts';

export const textOf = (root: string, file: string): string =>
  existsSync(posix.join(root, file)) ? readText(root, file) : '';

const relSpec = (index: string, target: string): string => {
  const rel = posix.relative(posix.dirname(index), target).replace(/(\/index)?\.[cm]?[jt]sx?$/, '');
  return rel.startsWith('.') ? rel : `./${rel}`;
};

/** Names an index already exports for another declaration: those imports stay where they are. */
export function clashes(ctx: DeepCtx, index: string, uses: readonly DeepImport[]): Set<string> {
  if (!ctx.layer.alias || !existsSync(posix.join(ctx.r.root, index))) return new Set();
  const has = exportSources(ctx, index);
  const seen = new Map<string, Map<string, Source>>();
  const declOf = (target: string, name: string): string => {
    const names = seen.get(target) ?? exportSources(ctx, target);
    seen.set(target, names);
    return names.get(name)?.file ?? target;
  };
  const bad = uses.flatMap((u) =>
    u.bindings.filter((b) => {
      const now = has.get(b.name)?.file;
      return now !== undefined && now !== declOf(u.target, b.name);
    }),
  );
  return new Set(bad.map((b) => b.name));
}

/** App index: named re-exports it lacks; a name any importer uses as a value is a value. */
function namedLines(ctx: DeepCtx, index: string, uses: readonly DeepImport[]): string[] {
  const has = existsSync(posix.join(ctx.r.root, index))
    ? exportSources(ctx, index)
    : new Map<string, Source>();
  const wanted = uses
    .filter((u) => u.named)
    .flatMap((u) => u.bindings.map((b) => ({ target: u.target, b })));
  const valueNames = new Set(wanted.filter((w) => !w.b.isType).map((w) => w.b.name));
  const fresh = wanted
    .filter((w) => !has.has(w.b.name))
    .filter((w, i, all) => all.findIndex((o) => o.b.name === w.b.name) === i);
  const byTarget = new Map<string, Binding[]>();
  fresh.forEach((w) => {
    const binding = { name: w.b.name, isType: !valueNames.has(w.b.name) };
    byTarget.set(w.target, [...(byTarget.get(w.target) ?? []), binding]);
  });
  return [...byTarget].map(([target, bindings]) =>
    declText({ kind: 'export', spec: relSpec(index, target), bindings }),
  );
}

/** Lines a feature index gains; a package index re-exports whole files, as packages do. */
export function indexLines(ctx: DeepCtx, index: string, uses: readonly DeepImport[]): string[] {
  const text = textOf(ctx.r.root, index);
  const starOf = (u: DeepImport): string => `export * from '${relSpec(index, u.target)}';`;
  const starred = ctx.layer.alias ? uses.filter((u) => u.star) : uses;
  const stars = [...new Set(starred.map(starOf))].filter((l) => !text.includes(l));
  const named = ctx.layer.alias ? namedLines(ctx, index, uses) : [];
  return [...named, ...stars];
}
