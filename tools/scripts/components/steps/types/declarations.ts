import ts from 'typescript';
import { readsAny } from '../../model/names.ts';

export type TypeDecl = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

export const isTypeDecl = (s: ts.Statement): s is TypeDecl =>
  ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s);

const typeParams = (d: TypeDecl, sf: ts.SourceFile): string =>
  d.typeParameters === undefined
    ? ''
    : `<${d.typeParameters.map((t) => t.getText(sf)).join(', ')}>`;

/** The exported form for `Name.types.ts`; `type X = {…}` becomes `interface X {…}` (class A). */
export function exportedText(d: TypeDecl, sf: ts.SourceFile): string {
  if (ts.isTypeAliasDeclaration(d) && ts.isTypeLiteralNode(d.type)) {
    return `export interface ${d.name.text}${typeParams(d, sf)} ${d.type.getText(sf)}`;
  }
  return `export ${d.getText(sf).replace(/^(?:export\s+)?(?:declare\s+)?/, '')}`;
}

/** Values the file declares at the top level (a type that reads one cannot leave the file). */
export const valueNames = (sf: ts.SourceFile): Set<string> =>
  new Set(
    sf.statements
      .filter(
        (s) => ts.isVariableStatement(s) || ts.isFunctionDeclaration(s) || ts.isEnumDeclaration(s),
      )
      .flatMap((s) =>
        ts.isVariableStatement(s)
          ? s.declarationList.declarations.map((d) => d.name.getText(sf))
          : [(s as ts.FunctionDeclaration | ts.EnumDeclaration).name?.getText(sf) ?? ''],
      ),
  );

export const readsValue = (nodes: readonly ts.Node[], values: ReadonlySet<string>): boolean =>
  [...readsAny(nodes)].some((n) => values.has(n));
