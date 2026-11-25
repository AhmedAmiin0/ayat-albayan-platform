import ts from 'typescript';
import type { Component } from '../../model/components.ts';
import { declaredNames, readsAny } from '../../model/names.ts';
import { partsOf } from '../../model/parts.ts';
import { HOOK } from '../../model/source.ts';
import { ownHookCalls } from '../hook/refusals.ts';

const isExported = (s: ts.Statement): boolean =>
  ts.canHaveModifiers(s) &&
  (ts.getModifiers(s) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

const viewOfBody = (c: Component): ts.Node[] => {
  if (c.fn.body === undefined) return [];
  const parts = partsOf(c.fn.body);
  const setup = ownHookCalls(c.fn).length === 0 ? parts.setup : [];
  return [...parts.guards, ...(parts.ret === undefined ? [] : [parts.ret]), ...setup];
};

/** What `Name.tsx` keeps reading once its logic is in its hook: the JSX, guards and parameters. */
const viewNodes = (c: Component, others: readonly ts.Statement[]): ts.Node[] => [
  ...viewOfBody(c),
  ...c.fn.parameters,
  ...(c.fn.type === undefined ? [] : [c.fn.type]),
  ...others,
];

interface Scope {
  c: Component;
  decls: readonly ts.Statement[];
  others: readonly ts.Statement[];
}

/** What leaves `Name.tsx`: what the view reads, exports and hooks, with all they read. */
export function movedDecls({ c, decls, others }: Scope): ts.Statement[] {
  const byName = new Map(
    decls.flatMap((d) => declaredNames(d).map((n): [string, ts.Statement] => [n, d])),
  );
  const viewReads = readsAny(viewNodes(c, others));
  const roots = decls.filter(
    (d) => isExported(d) || declaredNames(d).some((n) => viewReads.has(n) || HOOK.test(n)),
  );
  const moved = new Set(roots);
  const queue = [...roots];
  for (let d = queue.shift(); d !== undefined; d = queue.shift()) {
    const deps = [...readsAny([d])]
      .flatMap((n) => byName.get(n) ?? [])
      .filter((x) => !moved.has(x));
    deps.forEach((x) => moved.add(x));
    queue.push(...deps);
  }
  return decls.filter((d) => moved.has(d));
}
