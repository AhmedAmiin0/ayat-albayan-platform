import ts from 'typescript';

export const PASCAL = /^[A-Z](?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]*$/;
export const HOOK = /^use[A-Z]/;

export const parseFile = (path: string, text: string): ts.SourceFile =>
  ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

export const isFunctionLike = (
  n: ts.Node,
): n is ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration =>
  ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n);

/** Every node under `node` (itself included) that `test` accepts, in source order. */
export function findAll(node: ts.Node, test: (n: ts.Node) => boolean): ts.Node[] {
  const own = test(node) ? [node] : [];
  const kids: ts.Node[] = [];
  ts.forEachChild(node, (child) => {
    kids.push(...findAll(child, test));
  });
  return [...own, ...kids];
}

export const has = (node: ts.Node, test: (n: ts.Node) => boolean): boolean =>
  findAll(node, test).length > 0;

const NAME_OF: Partial<Record<ts.SyntaxKind, (e: ts.Expression) => string>> = {
  [ts.SyntaxKind.PropertyAccessExpression]: (e) => (e as ts.PropertyAccessExpression).name.text,
  [ts.SyntaxKind.Identifier]: (e) => (e as ts.Identifier).text,
};

export const calleeName = (call: ts.CallExpression): string =>
  NAME_OF[call.expression.kind]?.(call.expression) ?? '';

export const isCallTo = (n: ts.Node, names: RegExp): n is ts.CallExpression =>
  ts.isCallExpression(n) && names.test(calleeName(n));

export const isJsx = (n: ts.Node): boolean =>
  ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n);

export const kebabOf = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
