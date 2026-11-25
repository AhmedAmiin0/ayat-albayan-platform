// Rewrites a file's imports of kit paths that are no longer public (docs/64 PR 5): a moved path
// names its entry, a type namespace of a mocked module names its namespace in the test entry, and
// the statements that land on one entry merge. Mock paths stay: jest and vitest resolve those.
import { Node, SyntaxKind } from 'ts-morph';
import { applyEdits, namesOf, spanOf, statementText, typeNamespaceOf } from './statement.mjs';

const entryOfDeep = (spec, rule) =>
  Object.entries(rule.entries).find(([, paths]) => paths.includes(spec))?.[0] ?? rule.root;

const isDeep = (spec, rule) => spec.startsWith(rule.prefix) && !Object.hasOwn(rule.entries, spec);

/** The entry a path that is no longer public moves to, or undefined when it stays. */
export function targetOf(spec, table) {
  const rule = (table.deep ?? []).find((r) => isDeep(spec, r));
  return table.moves[spec] ?? (rule && entryOfDeep(spec, rule));
}

const keyOf = (s) => `${s.keyword}|${String(s.typeOnly)}|${s.spec}`;
const keywordOf = (decl) => (Node.isImportDeclaration(decl) ? 'import' : 'export');

function namespaceEntry(decl, rule) {
  const local = typeNamespaceOf(decl);
  if (local === undefined) return undefined;
  const name = local === rule.name ? rule.name : `${rule.name} as ${local}`;
  return { decl, keyword: 'import', typeOnly: true, spec: rule.spec, names: [name], moved: true };
}

const ELEMENT = /^(type )?(\w+)(?: as (\w+))?$/;

/** `name` or `name as local` under the name the entry exports it as. */
function renamed(text, renames) {
  const [, type = '', name, local] = ELEMENT.exec(text) ?? [];
  const next = name === undefined ? undefined : renames[name];
  return next === undefined ? text : `${type}${next} as ${local ?? name}`;
}

function movedEntry(decl, spec, renames = {}) {
  const names = namesOf(decl).map((text) => renamed(text, renames));
  if (names.length === 0) return undefined;
  return { decl, keyword: keywordOf(decl), typeOnly: decl.isTypeOnly(), spec, names, moved: true };
}

/** The statement `decl` becomes, `{ manual }` when no rule fits, or undefined when kept. */
function entryOf(decl, table) {
  const spec = decl.getModuleSpecifierValue();
  const rule = table.namespaces[spec];
  const target = targetOf(spec, table);
  if (rule === undefined && target === undefined) return undefined;
  const renames = table.renames?.[spec];
  const entry = rule ? namespaceEntry(decl, rule) : movedEntry(decl, target, renames);
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

/** `import('x')` of a moved path loads the entry instead: it re-exports the same module. */
const dynamicEdits = (sf, table) =>
  sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => c.getExpression().getKind() === SyntaxKind.ImportKeyword)
    .map((c) => c.getArguments()[0])
    .filter((a) => Node.isStringLiteral(a))
    .map((a) => ({ a, target: targetOf(a.getLiteralValue(), table) }))
    .filter(({ target }) => target !== undefined)
    .map(({ a, target }) => ({ start: a.getStart(), end: a.getEnd(), value: `'${target}'` }));

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
  const groups = Map.groupBy(
    all.filter((s) => s.decl),
    keyOf,
  );
  const touched = [...groups.values()].filter((g) => g.some((s) => s.moved));
  const dynamic = dynamicEdits(sf, table);
  const edits = [...touched.flatMap(groupEdits), ...dynamic];
  const out = edits.length === 0 ? text : applyEdits(text, edits);
  project.removeSourceFile(sf);
  const rewritten = all.filter((s) => s.moved).length + dynamic.length;
  const manual = all.filter((s) => s.manual).map((s) => `${file}: ${s.manual}`);
  return { text: out, rewritten, manual };
}
