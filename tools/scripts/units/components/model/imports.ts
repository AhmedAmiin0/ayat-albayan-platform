import ts from 'typescript';

/** One import declaration, reduced to what a file can re-emit for a subset of its names. */
export interface ImportDecl {
  spec: string;
  typeOnly: boolean;
  sideEffect: boolean;
  defaultName?: string;
  namespace?: string;
  named: { local: string; text: string; typeOnly: boolean }[];
}

const namedOf = (b: ts.NamedImportBindings | undefined, sf: ts.SourceFile): ImportDecl['named'] =>
  b !== undefined && ts.isNamedImports(b)
    ? b.elements.map((e) => ({ local: e.name.text, text: e.getText(sf), typeOnly: e.isTypeOnly }))
    : [];

const namespaceOf = (b: ts.NamedImportBindings | undefined): { namespace?: string } =>
  b !== undefined && ts.isNamespaceImport(b) ? { namespace: b.name.text } : {};

const isTypeClause = (clause: ts.ImportClause): boolean =>
  clause.phaseModifier === ts.SyntaxKind.TypeKeyword;

function clauseOf(d: ts.ImportDeclaration, sf: ts.SourceFile): Omit<ImportDecl, 'spec'> {
  const clause = d.importClause;
  if (clause === undefined) return { typeOnly: false, sideEffect: true, named: [] };
  return {
    typeOnly: isTypeClause(clause),
    sideEffect: false,
    named: namedOf(clause.namedBindings, sf),
    ...(clause.name === undefined ? {} : { defaultName: clause.name.text }),
    ...namespaceOf(clause.namedBindings),
  };
}

export function importsOf(sf: ts.SourceFile): ImportDecl[] {
  return sf.statements.filter(ts.isImportDeclaration).map((d) => ({
    spec: ts.isStringLiteral(d.moduleSpecifier) ? d.moduleSpecifier.text : '',
    ...clauseOf(d, sf),
  }));
}

export const importedNames = (decls: readonly ImportDecl[]): Set<string> =>
  new Set(
    decls.flatMap((d) => [
      ...(d.defaultName === undefined ? [] : [d.defaultName]),
      ...(d.namespace === undefined ? [] : [d.namespace]),
      ...d.named.map((n) => n.local),
    ]),
  );

const head = (d: ImportDecl, used: ReadonlySet<string>): string[] => [
  ...(d.defaultName !== undefined && used.has(d.defaultName) ? [d.defaultName] : []),
  ...(d.namespace !== undefined && used.has(d.namespace) ? [`* as ${d.namespace}`] : []),
];

interface EmitOptions {
  keepSideEffects: boolean;
  /** Every line as `import type`, inline `type` modifiers dropped (a `.types.ts` file). */
  typesOnly?: boolean;
}

/** Type-only as a whole: asked for, written so, or every kept name has an inline `type`. */
function isTypeLine(d: ImportDecl, kept: ImportDecl['named'], opts: EmitOptions): boolean {
  const allInline = kept.length > 0 && kept.every((n) => n.typeOnly);
  return d.typeOnly || opts.typesOnly === true || allInline;
}

const namedPart = (named: string[]): string[] =>
  named.length === 0 ? [] : [`{ ${named.join(', ')} }`];

function emitOne(d: ImportDecl, used: ReadonlySet<string>, opts: EmitOptions): string[] {
  if (d.sideEffect) return opts.keepSideEffects ? [`import '${d.spec}';`] : [];
  const kept = d.named.filter((n) => used.has(n.local));
  const first = head(d, used);
  const typeOnly = first.length === 0 && isTypeLine(d, kept, opts);
  const named = kept.map((n) => (typeOnly ? n.text.replace(/^type\s+/, '') : n.text));
  const parts = [...first, ...namedPart(named)];
  const lead = typeOnly ? 'type ' : '';
  return parts.length === 0 ? [] : [`import ${lead}${parts.join(', ')} from '${d.spec}';`];
}

/** The import lines that bring `used` into a file, in the original order. */
export const emitImports = (
  decls: readonly ImportDecl[],
  used: ReadonlySet<string>,
  opts: EmitOptions,
): string[] => decls.flatMap((d) => emitOne(d, used, opts));
