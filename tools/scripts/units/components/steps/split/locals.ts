import ts from 'typescript';
import type { Component } from '../../model/components.ts';
import { importedNames, importsOf } from '../../model/imports.ts';
import { declaredNames, readsAny } from '../../model/names.ts';

/** Names a sub-component may not read once it lives in its own folder (docs/63 §4 step 4). */
export function parentLocals(sf: ts.SourceFile, typesSpec: string): Set<string> {
  const declared = sf.statements.filter((s) => !ts.isImportDeclaration(s)).flatMap(declaredNames);
  const local = importsOf(sf).filter((d) => d.spec.startsWith('./') && d.spec !== typesSpec);
  return new Set([...declared, ...importedNames(local)]);
}

export const typeNamesFrom = (sf: ts.SourceFile, typesSpec: string): Set<string> =>
  importedNames(importsOf(sf).filter((d) => d.spec === typesSpec));

/** The first parent-local name the sub-component reads, if any. */
export const closesOver = (sub: Component, locals: ReadonlySet<string>): string | undefined =>
  [...readsAny([sub.statement])].find((n) => n !== sub.name && locals.has(n));

/** Everything in `Name.tsx` except the sub-component and the imports. */
export const restOf = (sf: ts.SourceFile, sub: Component): ts.Statement[] =>
  sf.statements.filter((s) => !ts.isImportDeclaration(s) && s !== sub.statement);
