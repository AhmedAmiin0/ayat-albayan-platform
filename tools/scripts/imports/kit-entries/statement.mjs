// One import or export-from statement as text, in the repo's print width.
import { Node } from 'ts-morph';

const WIDTH = 100;

/** `import { a, type B } from 'x';`, one name per line once it passes the print width. */
export function statementText({ keyword, typeOnly, spec }, names) {
  const head = `${keyword}${typeOnly ? ' type' : ''} {`;
  const one = `${head} ${names.join(', ')} } from '${spec}';`;
  if (one.length <= WIDTH) return one;
  return `${head}\n${names.map((n) => `  ${n},`).join('\n')}\n} from '${spec}';`;
}

const namedImports = (decl) =>
  decl.getDefaultImport() === undefined && decl.getNamespaceImport() === undefined
    ? decl.getNamedImports()
    : [];

/** The names of a plain named import or export-from; empty for every other shape. */
export function namesOf(decl) {
  const named = Node.isImportDeclaration(decl) ? namedImports(decl) : decl.getNamedExports();
  return named.map((e) => e.getText());
}

/** The local name of `import type * as N from 'x'`, else undefined. */
export function typeNamespaceOf(decl) {
  const plainType = Node.isImportDeclaration(decl) && decl.isTypeOnly();
  return plainType && decl.getDefaultImport() === undefined
    ? decl.getNamespaceImport()?.getText()
    : undefined;
}

/** The span of `decl`, with its line break when the statement goes. */
export function spanOf(decl, removed) {
  const end = decl.getEnd();
  const eol = removed && decl.getSourceFile().getFullText()[end] === '\n' ? 1 : 0;
  return { start: decl.getStart(), end: end + eol };
}

/** `text` with non-overlapping `{ start, end, value }` edits applied. */
export function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  return sorted.reduce((t, e) => t.slice(0, e.start) + e.value + t.slice(e.end), text);
}
