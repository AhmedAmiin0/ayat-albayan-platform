// Checks 3 and 4 for a whole component file: one component and nothing else at the top level
// (`Name.displayName = …` aside), and no type or interface.
import ts from 'typescript';

const isDisplayName = (s) =>
  ts.isExpressionStatement(s) &&
  ts.isBinaryExpression(s.expression) &&
  ts.isPropertyAccessExpression(s.expression.left) &&
  s.expression.left.name.text === 'displayName';

const isType = (s) => ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s);

const isNamedExport = (s, names) =>
  (ts.isExportDeclaration(s) &&
    s.moduleSpecifier === undefined &&
    s.exportClause !== undefined &&
    ts.isNamedExports(s.exportClause) &&
    s.exportClause.elements.every((e) => names.has(e.name.text))) ||
  (ts.isExportAssignment(s) && ts.isIdentifier(s.expression) && names.has(s.expression.text));

function isAllowed(s, comps, names) {
  return (
    ts.isImportDeclaration(s) ||
    isType(s) ||
    isDisplayName(s) ||
    isNamedExport(s, names) ||
    comps.some((c) => c.statement === s)
  );
}

/** Check 3 and 4 failures shared by every component of the file. */
export function fileFailures(sf, comps) {
  const names = new Set(comps.map((c) => c.name));
  const other = sf.statements.find((s) => !isAllowed(s, comps, names));
  const types = sf.statements.filter(isType).map((s) => s.name.text);
  return [
    ...(comps.length > 1 ? [{ check: 3, why: `${comps.length} components in one file` }] : []),
    ...(other === undefined
      ? []
      : [{ check: 3, why: `a top-level statement: ${other.getText(sf).slice(0, 60)}` }]),
    ...(types.length === 0
      ? []
      : [{ check: 4, why: `types belong in Name.types.ts: ${types.join(', ')}` }]),
  ];
}
