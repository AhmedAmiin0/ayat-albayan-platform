import ts from 'typescript';
import { identifiersNamed, lineEnd, narrow } from '../ast.ts';
import type { TextEdit } from '../../units/components/model/model.types.ts';
import type { CallEdit } from './source.types.ts';
import { isPairName } from './pair.ts';

const NAME_OF: ((p: ts.Node) => ts.Node | undefined)[] = [
  (p) => narrow(p, ts.isPropertyAccessExpression)?.name,
  (p) => narrow(p, ts.isPropertyAssignment)?.name,
];
const SPECIFIERS = new Set([ts.SyntaxKind.ImportSpecifier, ts.SyntaxKind.ExportSpecifier]);

const isNamePosition = (id: ts.Identifier): boolean =>
  SPECIFIERS.has(id.parent.kind) || NAME_OF.some((nameOf) => nameOf(id.parent) === id);

const within = (id: ts.Node, edits: readonly CallEdit[]): boolean =>
  edits.some(({ edit }) => id.getStart() >= edit.start && id.getEnd() <= edit.end);

/** References to `name` the rewrite leaves (a refused call, or the name passed as a value). */
export const leftReferences = (
  sf: ts.SourceFile,
  name: string,
  edits: readonly CallEdit[],
): ts.Identifier[] =>
  identifiersNamed(sf, name).filter((id) => !isNamePosition(id) && !within(id, edits));

export const namedImports = (s: ts.Statement): ts.NamedImports | undefined =>
  narrow(narrow(s, ts.isImportDeclaration)?.importClause?.namedBindings, ts.isNamedImports);

const localNames = (sf: ts.SourceFile): Set<string> =>
  new Set(sf.statements.flatMap((s) => namedImports(s)?.elements.map((e) => e.name.text) ?? []));

function declarationEdit(s: ts.Statement, named: ts.NamedImports, specifiers: string[]): TextEdit {
  const keepsDefault = narrow(s, ts.isImportDeclaration)?.importClause?.name !== undefined;
  return specifiers.length === 0 && !keepsDefault
    ? { start: s.getStart(), end: lineEnd(s), value: '' }
    : { start: named.getStart(), end: named.getEnd(), value: `{ ${specifiers.join(', ')} }` };
}

interface Imports {
  sf: ts.SourceFile;
  edits: readonly CallEdit[];
  known: ReadonlySet<string>;
  targetOf: ReadonlyMap<string, string>;
}

function editOf(s: ts.Statement, named: ts.NamedImports, ctx: Imports): TextEdit[] {
  const pair = named.elements.filter((e) => isPairName(e.name.text) && !e.propertyName);
  const added = [...new Set(pair.flatMap((e) => ctx.targetOf.get(e.name.text) ?? []))].filter(
    (t) => !ctx.known.has(t),
  );
  const unused = (e: ts.ImportSpecifier): boolean =>
    leftReferences(ctx.sf, e.name.text, ctx.edits).length === 0;
  const gone = new Set(pair.filter(unused).map((e) => e.name.text));
  const kept = named.elements.filter((e) => !gone.has(e.name.text)).map((e) => e.getText());
  const changed = added.length > 0 || gone.size > 0;
  return changed ? [declarationEdit(s, named, [...kept, ...added])] : [];
}

/** The import edits: pair names no longer used go, call/publicCall join the same declaration. */
export function importEdits(sf: ts.SourceFile, edits: readonly CallEdit[]): TextEdit[] {
  const plain = edits.filter((e) => e.named.plain);
  const targetOf = new Map(plain.map((e) => [e.named.name, e.named.target]));
  const ctx: Imports = { sf, edits, known: localNames(sf), targetOf };
  return sf.statements.flatMap((s) => {
    const named = namedImports(s);
    return named === undefined ? [] : editOf(s, named, ctx);
  });
}
