// What a source file exports under which name, and which names it imports from which workspace.
import ts from 'typescript';
import { targetOf } from './files.mjs';

const isExported = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;

const declaredOf = (statement) =>
  ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.filter((d) => ts.isIdentifier(d.name))
    : [statement];

const DECLARING = new Set([
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.VariableStatement,
]);

/** name → the top-level interface, type alias or variable declaration it names. */
export function localsOf(sf) {
  const statements = sf.statements.filter((s) => DECLARING.has(s.kind));
  return new Map(statements.flatMap(declaredOf).map((node) => [node.name.text, node]));
}

const modifierExports = (sf) =>
  sf.statements
    .filter((s) => DECLARING.has(s.kind) && isExported(s))
    .flatMap(declaredOf)
    .map((node) => ({ name: node.name.text, local: node.name.text }));

const isLocalList = (s) =>
  ts.isExportDeclaration(s) &&
  !s.moduleSpecifier &&
  s.exportClause &&
  ts.isNamedExports(s.exportClause);

const listExports = (sf) =>
  sf.statements
    .filter(isLocalList)
    .flatMap((s) => s.exportClause.elements)
    .map((e) => ({ name: e.name.text, local: (e.propertyName ?? e.name).text }));

/** Exported names with the local name each one reads; `export default <expr>` is in `defaults`. */
export function exportsOf(sf) {
  const named = [...modifierExports(sf), ...listExports(sf)];
  const defaults = sf.statements.filter((s) => ts.isExportAssignment(s) && !s.isExportEquals);
  return { named, defaults: defaults.map((s) => s.expression) };
}

const importNames = (clause) => [
  ...(clause.name ? ['default'] : []),
  ...(clause.namedBindings && ts.isNamedImports(clause.namedBindings)
    ? clause.namedBindings.elements.map((e) => (e.propertyName ?? e.name).text)
    : []),
];

const reExportNames = (s) =>
  s.exportClause && ts.isNamedExports(s.exportClause)
    ? s.exportClause.elements.map((e) => (e.propertyName ?? e.name).text)
    : [];

const NAMES = {
  [ts.SyntaxKind.ImportDeclaration]: (s) => (s.importClause ? importNames(s.importClause) : []),
  [ts.SyntaxKind.ExportDeclaration]: (s) => (s.moduleSpecifier ? reExportNames(s) : []),
};

/** `{ name, target }` per imported or re-exported name read from a workspace, in source order. */
export function importsOf(sf, path) {
  return sf.statements.flatMap((s) => {
    const names = NAMES[s.kind]?.(s) ?? [];
    const target = names.length === 0 ? null : targetOf(s.moduleSpecifier.text, path);
    return target === null ? [] : names.map((name) => ({ name, target }));
  });
}
