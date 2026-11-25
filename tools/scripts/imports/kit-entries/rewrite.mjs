// Rewrites a file's imports of kit paths that are no longer public (docs/64 PR 5): a moved path
// names its entry, a type namespace of a mocked module names its namespace in the test entry, and
// the statements that land on one entry merge. Mock paths stay: jest and vitest resolve those.
import { Node, SyntaxKind } from 'ts-morph';
import { applyEdits, namesOf, spanOf, statementText, typeNamespaceOf } from './statement.mjs';

const keyOf = (s) => `${s.keyword}|${String(s.typeOnly)}|${s.spec}`;
const keywordOf = (decl) => (Node.isImportDeclaration(decl) ? 'import' : 'export');

function namespaceEntry(decl, rule) {
  const local = typeNamespaceOf(decl);
  if (local === undefined) return undefined;
  const name = local === rule.name ? rule.name : `${rule.name} as ${local}`;
  return { decl, keyword: 'import', typeOnly: true, spec: rule.spec, names: [name], moved: true };
}

function movedEntry(decl, spec) {
  const names = namesOf(decl);
  if (names.length === 0) return undefined;
  return { decl, keyword: keywordOf(decl), typeOnly: decl.isTypeOnly(), spec, names, moved: true };
}

/** The statement `decl` becomes, `{ manual }` when no rule fits, or undefined when kept. */
function entryOf(decl, table) {
  const spec = decl.getModuleSpecifierValue();
  const rule = table.namespaces[spec];
  const target = table.moves[spec];
  if (rule === undefined && target === undefined) return undefined;
  const entry = rule ? namespaceEntry(decl, rule) : movedEntry(decl, target);
  return entry ?? { manual: decl.getText() };
}

function keptEntry(decl) {
  const names = namesOf(decl);
  if (names.length === 0) return [];
  const spec = decl.getModuleSpecifierValue();
  return [{ decl, keyword: keywordOf(decl), typeOnly: decl.isTypeOnly(), spec, names }];
}

function groupEdits(group) {
  const [first, ...rest] = group;
  const names = [...new Set(group.flatMap((s) => s.names))];
  const merged = { ...spanOf(first.decl, false), value: statementText(first, names) };
  return [merged, ...rest.map((s) => ({ ...spanOf(s.decl, true), value: '' }))];
}

const dynamicImports = (sf, table) =>
  sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => c.getExpression().getKind() === SyntaxKind.ImportKeyword)
    .map((c) => c.getArguments()[0])
    .filter((a) => Node.isStringLiteral(a) && Object.hasOwn(table.moves, a.getLiteralValue()))
    .map((a) => `import(${a.getText()})`);

function statements(sf, table) {
  const decls = [...sf.getImportDeclarations(), ...sf.getExportDeclarations()]
    .filter((d) => d.getModuleSpecifierValue() !== undefined)
    .sort((a, b) => a.getStart() - b.getStart());
  return decls.map((decl) => entryOf(decl, table) ?? keptEntry(decl)).flat();
}

/** `{ text, rewritten, manual }` for one file; `manual` lists what no rule rewrites. */
export function rewriteKitImports(project, { file, text }, table) {
  const sf = project.createSourceFile(`/virtual/${file}`, text, { overwrite: true });
  const all = statements(sf, table);
  const manual = [...all.filter((s) => s.manual), ...dynamicImports(sf, table)];
  const groups = Map.groupBy(all.filter((s) => s.decl), keyOf);
  const touched = [...groups.values()].filter((g) => g.some((s) => s.moved));
  const edits = touched.flatMap(groupEdits);
  const out = edits.length === 0 ? text : applyEdits(text, edits);
  project.removeSourceFile(sf);
  const rewritten = all.filter((s) => s.moved).length;
  return { text: out, rewritten, manual: manual.map((m) => `${file}: ${m.manual ?? m}`) };
}
