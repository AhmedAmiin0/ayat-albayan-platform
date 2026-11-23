// Moves names of import and export-from statements to other specifiers: one statement per
// specifier, merged into the file's own statement of that specifier when it has one.
import type { SourceFile } from 'ts-morph';
import { applyEdits } from '../../ci-checks/move-module/specifiers.ts';
import { FACADE, namedOf, pushTo, spanOf, statementText } from './statement.ts';
import type { Named, Route } from './types.ts';

interface State {
  targets: Map<string, Named>;
  added: Map<string, string[]>;
  specs: Set<string>;
}

const keyOf = (n: Omit<Named, 'decl' | 'elements'>): string =>
  `${n.keyword}|${String(n.typeOnly)}|${n.spec}`;

/** A new statement for `spec`, or nothing when its names join the file's own statement. */
function place(n: Named, [spec, texts]: [string, string[]], state: State): string[] {
  state.specs.add(spec);
  const key = keyOf({ ...n, spec });
  if (!state.targets.has(key)) return [statementText({ ...n, spec }, texts)];
  pushTo(state.added, key, ...texts);
  return [];
}

function edit(n: Named, route: Route, state: State): { start: number; end: number; value: string } {
  const moved = [...route.moved].sort(([a], [b]) => a.localeCompare(b));
  const lines = [
    ...(route.stay.length > 0 ? [statementText(n, route.stay)] : []),
    ...moved.flatMap((g) => place(n, g, state)),
  ];
  return { ...spanOf(n.decl, lines.length === 0), value: lines.join('\n') };
}

function joinTargets(state: State): { start: number; end: number; value: string }[] {
  return [...state.added].flatMap(([key, names]) => {
    const t = state.targets.get(key);
    if (t === undefined) return [];
    const value = statementText(t, [...t.elements.map((e) => e.text), ...names]);
    return [{ ...spanOf(t.decl, false), value }];
  });
}

/** The text of `sf` with each statement `route` answers for moved; and the specifiers moved to. */
export function relocate(
  sf: SourceFile,
  route: (n: Named) => Route | undefined,
): { text: string; specs: string[] } {
  const named = [...sf.getImportDeclarations(), ...sf.getExportDeclarations()].flatMap(
    (d) => namedOf(d) ?? [],
  );
  const routed = named.flatMap((n) => {
    const r = route(n);
    return r === undefined ? [] : [{ n, r }];
  });
  const moving = new Set(routed.map(({ n }) => n));
  const state: State = {
    targets: new Map(named.filter((n) => !moving.has(n)).map((n) => [keyOf(n), n])),
    added: new Map(),
    specs: new Set(),
  };
  const edits = routed.map(({ n, r }) => edit(n, r, state));
  const text = applyEdits(sf.getFullText(), [...edits, ...joinTargets(state)]);
  return { text, specs: [...state.specs].sort() };
}

function byOwner(n: Named, owners: ReadonlyMap<string, string>): Route | undefined {
  if (n.spec !== FACADE || !n.elements.some((e) => owners.has(e.name))) return undefined;
  const groups = new Map<string, string[]>();
  for (const e of n.elements) pushTo(groups, owners.get(e.name) ?? FACADE, e.text);
  const stay = groups.get(FACADE) ?? [];
  groups.delete(FACADE);
  return { stay, moved: [...groups] };
}

/** The file's text with owner-held facade names moved, and the owners it now imports. */
export function rewriteFacade(
  sf: SourceFile,
  owners: ReadonlyMap<string, string>,
): { text: string; owners: string[] } {
  const out = relocate(sf, (n) => byOwner(n, owners));
  return { text: out.text, owners: out.specs };
}
