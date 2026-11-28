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

interface Use {
  target: string;
  b: Binding;
}

/** Names wanted from two declarations: the index can only carry one, so both stay deep. */
function contested(wanted: readonly Use[], declOf: (w: Use) => string): string[] {
  const byName = new Map<string, Set<string>>();
  wanted.forEach((w) => byName.set(w.b.name, (byName.get(w.b.name) ?? new Set()).add(declOf(w))));
  return [...byName].filter(([, decls]) => decls.size > 1).map(([name]) => name);
}

/** Names the index exports for another declaration, or as a type only to a value importer. */
interface Has {
  names: Map<string, Source>;
  text: string;
}

/** Exported for another declaration, or as a type in an `export type {}` a value cannot use. */
function taken(has: Has, w: Use, declOf: (w: Use) => string): boolean {
  const now = has.names.get(w.b.name);
  if (now === undefined) return false;
  const stuckType =
    now.typeOnly === true && !w.b.isType && valueExports(has.text, [w.b.name]) === has.text;
  return now.file !== declOf(w) || stuckType;
}

/** Names an index cannot carry for these imports: those imports stay where they are. */
export function clashes(ctx: DeepCtx, index: string, uses: readonly DeepImport[]): Set<string> {
  if (!ctx.layer.alias) return new Set();
  const names = existsSync(posix.join(ctx.r.root, index))
    ? exportSources(ctx, index)
    : new Map<string, Source>();
  const has = { names, text: textOf(ctx.r.root, index) };
  const seen = new Map<string, Map<string, Source>>();
  const declOf = (w: Use): string => {
    const names = seen.get(w.target) ?? exportSources(ctx, w.target);
    seen.set(w.target, names);
    return names.get(w.b.name)?.file ?? w.target;
  };
  const wanted = uses.flatMap((u) => u.bindings.map((b) => ({ target: u.target, b })));
  const bad = wanted.filter((w) => taken(has, w, declOf)).map((w) => w.b.name);
  return new Set([...bad, ...contested(wanted, declOf)]);
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

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** An index that re-exports a value as `type X` inside `export { … }` exports it as a value. */
export function valueExports(text: string, names: readonly string[]): string {
  return names.reduce(
    (acc, name) =>
      acc.replace(/export \{[^}]*\}/g, (block) =>
        block.replace(new RegExp(`\\btype ${escape(name)}\\b`), name),
      ),
    text,
  );
}
