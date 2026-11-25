import ts from 'typescript';

/** Identifiers a binding name declares: `a`, `{ a, b: c }` → c, `[d, ...e]`. */
export function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((e) => (ts.isOmittedExpression(e) ? [] : bindingNames(e.name)));
}

/** Names a statement declares at its own level. */
export function declaredNames(s: ts.Statement): string[] {
  if (ts.isVariableStatement(s))
    return s.declarationList.declarations.flatMap((d) => bindingNames(d.name));
  const named = ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s);
  return named && s.name !== undefined ? [s.name.text] : [];
}

/** An identifier that names a property or attribute, not a value in scope. */
function isKey(id: ts.Identifier): boolean {
  const p = id.parent;
  return (
    (ts.isPropertyAccessExpression(p) && p.name === id) ||
    (ts.isPropertyAssignment(p) && p.name === id) ||
    (ts.isJsxAttribute(p) && p.name === id) ||
    (ts.isBindingElement(p) && p.propertyName === id) ||
    (ts.isQualifiedName(p) && p.right === id) ||
    ((ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === id)
  );
}

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
