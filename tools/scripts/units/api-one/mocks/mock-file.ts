import ts from 'typescript';
import { identifiersNamed, lineOf } from '../ast.ts';
import { applyEdits } from '../../components/model/edits.ts';
import { parseFile } from '../../components/model/source.ts';
import type { FileResult } from '../source/source.types.ts';
import { mockDeclarations, namesOf } from './declarations.ts';
import { bindingOf, kitMocks } from './kit-mock.ts';
import { declaredHandlers, importEdit, objectEdit, statementEdits } from './mock-statements.ts';
import type { Binding, Bound, Declared, Inline, KitMock, Plan, Use } from './mocks.types.ts';
import { MOCK, useEdit } from './uses.ts';

type Span = [number, number];

const span = (n: ts.Node): Span => [n.getStart(), n.getEnd()];
const within = (n: ts.Node, spans: readonly Span[]): boolean =>
  spans.some(([s, e]) => n.getStart() >= s && n.getEnd() <= e);
const usesOf = (sf: ts.SourceFile, name: string, skip: readonly Span[]): ts.Identifier[] =>
  identifiersNamed(sf, name).filter((n) => !ts.isImportSpecifier(n.parent) && !within(n, skip));
const isLocal = (b: Bound | undefined): b is Binding => b?.type === 'local';
const isInline = (b: Bound | undefined): b is Inline => b?.type === 'inline';

interface Gathered {
  bound: (Bound | undefined)[];
  locals: Binding[];
  inlines: Inline[];
  declared: Declared[];
  skip: Span[];
}

function gather(sf: ts.SourceFile, mocks: readonly KitMock[]): Gathered {
  const bound = mocks.flatMap((m) => m.pair.map(bindingOf));
  const locals = bound.filter(isLocal);
  const declarations = mockDeclarations(sf);
  const declared = locals.flatMap((b) => declarations.get(b.local) ?? []);
  const skip = [...declared.map((d) => span(d.statement)), ...mocks.map((m) => span(m.object))];
  return { bound, locals, inlines: bound.filter(isInline), declared, skip };
}

/** Why the file's mocks cannot move, checked in order; undefined when they can. */
function refusalOf(sf: ts.SourceFile, g: Gathered): string | undefined {
  const locals = new Set(g.locals.map((b) => b.local));
  const others = (d: Declared): boolean => namesOf(d.statement).some((n) => !locals.has(n));
  const checks: [boolean, string][] = [
    [g.bound.includes(undefined), 'a kit mock that forwards to no mock function'],
    [identifiersNamed(sf, MOCK).length > 0, `${MOCK} taken`],
    [g.declared.length < g.locals.length, 'a mock not declared as a mock function'],
    [g.declared.some(others), 'a declaration of other names'],
    [
      g.inlines.some((i) => usesOf(sf, i.key, g.skip).length > 0),
      'an inline mock also used by name',
    ],
  ];
  return checks.find(([failed]) => failed)?.[1];
}

const refusedUse = (uses: readonly Use[]): string | undefined =>
  uses.flatMap((u) => (u.ok ? [] : [u.refused]))[0];

/** The top-level statement a node sits in. */
const statementOf = (sf: ts.SourceFile, n: ts.Node): ts.Statement | undefined =>
  sf.statements.find((s) => s.getStart() <= n.getStart() && n.getEnd() <= s.getEnd());

function planMocks(sf: ts.SourceFile, mocks: readonly KitMock[], first: ts.Statement): Plan {
  const g = gather(sf, mocks);
  const uses = g.locals.flatMap((b) =>
    usesOf(sf, b.local, g.skip).map((id) => useEdit(id, b.kind)),
  );
  const handlers = declaredHandlers(g.declared, g.locals);
  const lost = handlers.some((h) => h.handler === null) ? 'a handler it cannot move' : undefined;
  const refusal = refusalOf(sf, g) ?? refusedUse(uses) ?? lost;
  if (refusal !== undefined) return { ok: false, refused: refusal };
  const statements = statementEdits({ declared: g.declared, handlers, inlines: g.inlines, first });
  const edits = uses.flatMap((u) => (u.ok ? [u.edit] : []));
  return {
    ok: true,
    edits: [...edits, ...statements, ...mocks.map(objectEdit), ...importEdit(sf)],
  };
}

/** A test file's kit mocks of the pair moved to mockCall(), or listed with why they stay. */
export function rewriteMocks(path: string, text: string): FileResult {
  const sf = parseFile(path, text);
  const mocks = kitMocks(sf);
  const object = mocks[0]?.object;
  const first = object === undefined ? undefined : statementOf(sf, object);
  if (object === undefined || first === undefined) return { text, found: [] };
  const plan = planMocks(sf, mocks, first);
  const line = lineOf(object);
  return plan.ok
    ? {
        text: applyEdits(text, plan.edits),
        found: [{ line, result: 'rewritten', reason: 'mocks' }],
      }
    : { text, found: [{ line, result: 'left', reason: `mocks: ${plan.refused}` }] };
}
