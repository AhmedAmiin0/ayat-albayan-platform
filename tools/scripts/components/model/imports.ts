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

function clauseOf(d: ts.ImportDeclaration, sf: ts.SourceFile): Omit<ImportDecl, 'spec'> {
  const clause = d.importClause;
  if (clause === undefined) return { typeOnly: false, sideEffect: true, named: [] };
  const bindings = clause.namedBindings;
  const named =
    bindings !== undefined && ts.isNamedImports(bindings)
      ? bindings.elements.map((e) => ({
          local: e.name.text,
          text: e.getText(sf),
          typeOnly: e.isTypeOnly,
        }))
      : [];
  const namespace =
    bindings !== undefined && ts.isNamespaceImport(bindings) ? bindings.name.text : undefined;
  return {
    typeOnly: clause.isTypeOnly,
    sideEffect: false,
    named,
    ...(clause.name === undefined ? {} : { defaultName: clause.name.text }),
    ...(namespace === undefined ? {} : { namespace }),
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

function emitOne(d: ImportDecl, used: ReadonlySet<string>, opts: EmitOptions): string[] {
  if (d.sideEffect) return opts.keepSideEffects ? [`import '${d.spec}';`] : [];
  const kept = d.named.filter((n) => used.has(n.local));
  const allInline = kept.length > 0 && kept.every((n) => n.typeOnly) && head(d, used).length === 0;
  const typeOnly = d.typeOnly || opts.typesOnly === true || allInline;
  const named = kept.map((n) => (typeOnly ? n.text.replace(/^type\s+/, '') : n.text));
  const parts = [...head(d, used), ...(named.length === 0 ? [] : [`{ ${named.join(', ')} }`])];
  if (parts.length === 0) return [];
  return [`import ${typeOnly ? 'type ' : ''}${parts.join(', ')} from '${d.spec}';`];
}

/** The import lines that bring `used` into a file, in the original order. */
export const emitImports = (
  decls: readonly ImportDecl[],
  used: ReadonlySet<string>,
  opts: EmitOptions,
): string[] => decls.flatMap((d) => emitOne(d, used, opts));
