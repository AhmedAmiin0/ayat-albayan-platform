import ts from 'typescript';
import { has, isFunctionLike, isJsx, PASCAL } from './source.ts';

export type ComponentFn = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration;

/** A top-level component: its name, its function, whether a call wraps it, its statement. */
export interface Component {
  name: string;
  fn: ComponentFn;
  wrapped: boolean;
  statement: ts.Statement;
}

function functionOf(
  init: ts.Expression | undefined,
): { fn: ComponentFn; wrapped: boolean } | undefined {
  if (init === undefined) return undefined;
  if (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
    return { fn: init, wrapped: false };
  if (!ts.isCallExpression(init)) return undefined;
  const inner = init.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
  return inner !== undefined && isFunctionLike(inner) && !ts.isFunctionDeclaration(inner)
    ? { fn: inner, wrapped: true }
    : undefined;
}

const returnsJsx = (fn: ComponentFn): boolean => fn.body !== undefined && has(fn.body, isJsx);

function fromStatement(s: ts.Statement): Component[] {
  if (ts.isFunctionDeclaration(s)) {
    const name = s.name?.text ?? '';
    return PASCAL.test(name) && returnsJsx(s)
      ? [{ name, fn: s, wrapped: false, statement: s }]
      : [];
  }
  if (!ts.isVariableStatement(s)) return [];
  return s.declarationList.declarations.flatMap((d) => {
    const found = ts.isIdentifier(d.name) ? functionOf(d.initializer) : undefined;
    const name = ts.isIdentifier(d.name) ? d.name.text : '';
    return found !== undefined && PASCAL.test(name) && returnsJsx(found.fn)
      ? [{ name, ...found, statement: s }]
      : [];
  });
}

/** Top-level PascalCase functions, or consts holding one, whose body has JSX. */
export const componentsOf = (sf: ts.SourceFile): Component[] =>
  sf.statements.flatMap(fromStatement);
