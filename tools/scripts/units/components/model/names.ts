import ts from 'typescript';

/** Identifiers a binding name declares: `a`, `{ a, b: c }` → c, `[d, ...e]`. */
export function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((e) => (ts.isOmittedExpression(e) ? [] : bindingNames(e.name)));
}

const isNamedDeclaration = (
  s: ts.Statement,
): s is ts.FunctionDeclaration | ts.ClassDeclaration | ts.EnumDeclaration =>
  ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s);

/** Names a statement declares at its own level. */
export function declaredNames(s: ts.Statement): string[] {
  if (ts.isVariableStatement(s)) {
    return s.declarationList.declarations.flatMap((d) => bindingNames(d.name));
  }
  return isNamedDeclaration(s) && s.name !== undefined ? [s.name.text] : [];
}

const keyed =
  <T extends ts.Node>(is: (n: ts.Node) => n is T, key: (n: T) => ts.Node | undefined) =>
  (p: ts.Node): ts.Node | undefined =>
    is(p) ? key(p) : undefined;

const KEYS = [
  keyed(ts.isPropertyAccessExpression, (p) => p.name),
  keyed(ts.isPropertyAssignment, (p) => p.name),
  keyed(ts.isJsxAttribute, (p) => p.name),
  keyed(ts.isBindingElement, (p) => p.propertyName),
  keyed(ts.isQualifiedName, (p) => p.right),
  keyed(ts.isPropertySignature, (p) => p.name),
  keyed(ts.isMethodDeclaration, (p) => p.name),
];

/** An identifier that names a property or attribute, not a value in scope. */
export const isKey = (id: ts.Identifier): boolean => KEYS.some((key) => key(id.parent) === id);

/** Value and type names `node` reads (declarations it makes are included; callers intersect). */
export function readNames(node: ts.Node): Set<string> {
  const out = new Set<string>();
  const walk = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && !isKey(n)) out.add(n.text);
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText();
      out.add(tag.split('.')[0] ?? tag);
    }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}

export const readsAny = (nodes: readonly ts.Node[]): Set<string> =>
  new Set(nodes.flatMap((n) => [...readNames(n)]));
