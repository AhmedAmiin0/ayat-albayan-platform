import ts from 'typescript';
import { lineEnd } from '../ast.ts';
import type { TextEdit } from '../../components/model/model.types.ts';
import { namesOf } from './declarations.ts';
import { handlerText } from './handler.ts';
import type { Binding, Declared, Handler, Inline, KitMock, MockKind } from './mocks.types.ts';
import { MOCK } from './uses.ts';

const IMPORT = "import { mockCall } from '@ab/testing/mock-call';";
const CALL_KEY = `call: (request: unknown) => ${MOCK}.call(request)`;
const ON: Record<MockKind, string> = { read: 'onRead', write: 'onWrite' };

/** The kit mock's object with the pair keys replaced by one `call` key. */
export function objectEdit({ object, pair }: KitMock): TextEdit {
  const kept = object.properties.filter((p) => !pair.includes(p)).map((p) => p.getText());
  const value = `{\n  ${[...kept, CALL_KEY].join(',\n  ')},\n}`;
  return { start: object.getStart(), end: object.getEnd(), value };
}

function handlerOf(d: Declared, kindOf: ReadonlyMap<string, MockKind>): Handler[] {
  const kind = kindOf.get(namesOf(d.statement).find((n) => kindOf.has(n)) ?? '') ?? 'read';
  return d.impl === undefined ? [] : [{ kind, handler: handlerText(d.impl, kind) ?? null }];
}

/** Each mock function's own implementation, as a mockCall handler. */
export function declaredHandlers(declared: readonly Declared[], locals: readonly Binding[]) {
  const kindOf = new Map(locals.map((b) => [b.local, b.kind]));
  return [...new Set(declared)].flatMap((d) => handlerOf(d, kindOf));
}

interface Statements {
  declared: readonly Declared[];
  handlers: readonly Handler[];
  inlines: readonly Inline[];
  /** The statement `const mockApi` goes before when no mock declaration is left to replace. */
  first: ts.Statement;
}

const linesOf = (handlers: readonly Handler[]): string =>
  [
    `const ${MOCK} = mockCall();`,
    ...handlers.flatMap((h) =>
      h.handler === null ? [] : [`${MOCK}.${ON[h.kind]}(${h.handler});`],
    ),
  ].join('\n');

/** `const mockApi = mockCall();` and its handlers in place of the first mock declaration. */
export function statementEdits({ declared, handlers, inlines, first }: Statements): TextEdit[] {
  const statements = [...new Set(declared.map((d) => d.statement))].toSorted(
    (a, b) => a.pos - b.pos,
  );
  const lines = linesOf([...handlers, ...inlines]);
  const [head, ...rest] = statements;
  const placed: TextEdit =
    head === undefined
      ? { start: first.getStart(), end: first.getStart(), value: `${lines}\n` }
      : { start: head.getStart(), end: head.getEnd(), value: lines };
  return [placed, ...rest.map((s) => ({ start: s.getStart(), end: lineEnd(s), value: '' }))];
}

/** The mockCall import after the last import. */
export function importEdit(sf: ts.SourceFile): TextEdit[] {
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const has = imports.some((s) => s.getText().includes('@ab/testing/mock-call'));
  const at = imports.at(-1)?.getEnd() ?? 0;
  const value = at === 0 ? `${IMPORT}\n` : `\n${IMPORT}`;
  return has ? [] : [{ start: at, end: at, value }];
}
