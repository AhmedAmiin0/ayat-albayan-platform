import ts from 'typescript';
import { narrow, unwrap } from '../ast.ts';
import type { Declared } from './mocks.types.ts';

const MOCK_FN = /^(?:vi|jest)\.fn$/;

export function isMockFn(e: ts.Node | undefined): e is ts.CallExpression {
  const call = narrow(e, ts.isCallExpression);
  return call !== undefined && MOCK_FN.test(call.expression.getText());
}

/** `vi.hoisted(() => X)` → X; anything else as it is. */
function unhoisted(e: ts.Expression | undefined): ts.Node | undefined {
  const call = narrow(e, ts.isCallExpression);
  const hoisted = call?.expression.getText() === 'vi.hoisted' ? call.arguments[0] : undefined;
  const body = narrow(hoisted, ts.isArrowFunction)?.body;
  return unwrap(body === undefined || ts.isBlock(body) ? e : body);
}

const declared = (statement: ts.VariableStatement, fn: ts.CallExpression): Declared => ({
  statement,
  impl: fn.arguments[0],
});

/** `const x = vi.hoisted(() => vi.fn(impl))`, `const x = jest.fn(impl)`. */
function single(s: ts.VariableStatement, d: ts.VariableDeclaration): [string, Declared][] {
  const value = unhoisted(d.initializer);
  const name = narrow(d.name, ts.isIdentifier)?.text;
  return name !== undefined && isMockFn(value) ? [[name, declared(s, value)]] : [];
}

/** `const { a, b } = vi.hoisted(() => ({ a: vi.fn(), b: vi.fn(impl) }))`. */
function destructured(s: ts.VariableStatement, d: ts.VariableDeclaration): [string, Declared][] {
  const object = narrow(unhoisted(d.initializer), ts.isObjectLiteralExpression);
  return (object?.properties ?? []).flatMap((p): [string, Declared][] => {
    const value = narrow(p, ts.isPropertyAssignment)?.initializer;
    const name = narrow(p.name, ts.isIdentifier)?.text;
    return name !== undefined && isMockFn(value) ? [[name, declared(s, value)]] : [];
  });
}

function declarationsOf(s: ts.VariableStatement): [string, Declared][] {
  const [d, ...more] = s.declarationList.declarations;
  if (d === undefined || more.length > 0) return [];
  return ts.isObjectBindingPattern(d.name) ? destructured(s, d) : single(s, d);
}

/** The top-level mock declarations of a test file, by the name they declare. */
export const mockDeclarations = (sf: ts.SourceFile): Map<string, Declared> =>
  new Map(sf.statements.filter(ts.isVariableStatement).flatMap(declarationsOf));

/** Every name a statement declares: a destructured mock statement must declare only mocks. */
export const namesOf = (s: ts.VariableStatement): string[] =>
  s.declarationList.declarations.flatMap((d) =>
    ts.isObjectBindingPattern(d.name)
      ? d.name.elements.map((e) => e.name.getText())
      : [d.name.getText()],
  );
