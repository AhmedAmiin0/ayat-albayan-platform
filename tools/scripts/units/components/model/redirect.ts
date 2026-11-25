import { posix } from 'node:path';
import ts from 'typescript';
import { parseFile } from './source.ts';

/** Where moved names now live: name → repo path without extension. */
export type Moved = ReadonlyMap<string, string>;

type Clause = ts.ImportDeclaration | ts.ExportDeclaration;

const specText = (s: Clause): string =>
  s.moduleSpecifier !== undefined && ts.isStringLiteral(s.moduleSpecifier)
    ? s.moduleSpecifier.text
    : '';

const relative = (from: string, to: string): string => {
  const rel = posix.relative(posix.dirname(from), to);
  return rel.startsWith('.') ? rel : `./${rel}`;
};

function importElements(s: ts.ImportDeclaration): readonly ts.ImportSpecifier[] {
  const clause = s.importClause;
  const b = clause?.namedBindings;
  if (clause?.name !== undefined || b === undefined) return [];
  return ts.isNamedImports(b) ? b.elements : [];
}

function elementsOf(s: Clause): readonly (ts.ImportSpecifier | ts.ExportSpecifier)[] {
  if (ts.isImportDeclaration(s)) return importElements(s);
  return s.exportClause !== undefined && ts.isNamedExports(s.exportClause)
    ? s.exportClause.elements
    : [];
}

const keyword = (s: Clause): string => (ts.isImportDeclaration(s) ? 'import' : 'export');

const isTypeClause = (s: Clause): boolean =>
  ts.isImportDeclaration(s)
    ? s.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword
    : s.isTypeOnly;

function line(s: Clause, texts: string[], spec: string): string {
  const kind = isTypeClause(s) ? 'type ' : '';
  return `${keyword(s)} ${kind}{ ${texts.join(', ')} } from '${spec}';`;
}

const nameOf = (e: ts.ImportSpecifier | ts.ExportSpecifier): string =>
  (e.propertyName ?? e.name).text;

/** The clause split by where each name now lives; its own text when nothing moved. */
function split(s: Clause, at: { path: string; moved: Moved; sf: ts.SourceFile }): string {
  const els = elementsOf(s);
  if (!els.some((e) => at.moved.has(nameOf(e)))) return s.getText(at.sf);
  const byTarget = new Map<string, string[]>();
  els.forEach((e) => {
    const target = at.moved.get(nameOf(e));
    const key = target === undefined ? specText(s) : relative(at.path, target);
    byTarget.set(key, [...(byTarget.get(key) ?? []), e.getText(at.sf)]);
  });
  return [...byTarget].map(([spec, texts]) => line(s, texts, spec)).join('\n');
}

/** `path`'s imports and re-exports of `owner` (repo path, no extension) follow the moved names. */
export function redirect(path: string, text: string, at: { owner: string; moved: Moved }): string {
  const sf = parseFile(path, text);
  const own = (s: ts.Statement): s is Clause =>
    (ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) &&
    specText(s).startsWith('.') &&
    posix.join(posix.dirname(path), specText(s)) === at.owner;
  const edits = sf.statements
    .filter(own)
    .map((s) => ({ s, value: split(s, { path, moved: at.moved, sf }) }));
  return edits
    .toSorted((a, b) => b.s.getStart(sf) - a.s.getStart(sf))
    .reduce((out, e) => out.slice(0, e.s.getStart(sf)) + e.value + out.slice(e.s.getEnd()), text);
}
