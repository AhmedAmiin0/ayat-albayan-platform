import { Node, type ExportDeclaration, type ImportDeclaration, type SourceFile } from 'ts-morph';
import type { Binding, ModuleRef } from '../apply.types.ts';

type Decl = ImportDeclaration | ExportDeclaration;

function importBindings(d: ImportDeclaration): Binding[] {
  const typeOnly = d.isTypeOnly();
  return d.getNamedImports().map((n) => ({
    name: n.getName(),
    alias: n.getAliasNode()?.getText(),
    isType: typeOnly || n.isTypeOnly(),
  }));
}

function exportBindings(d: ExportDeclaration): Binding[] {
  const typeOnly = d.isTypeOnly();
  return d.getNamedExports().map((n) => ({
    name: n.getName(),
    alias: n.getAliasNode()?.getText(),
    isType: typeOnly || n.isTypeOnly(),
  }));
}

/** Named bindings only: a default, namespace or `export *` cannot be split by name. */
function splittable(d: Decl): boolean {
  if (Node.isImportDeclaration(d)) {
    return d.getDefaultImport() === undefined && d.getNamespaceImport() === undefined;
  }
  return d.getNamedExports().length > 0 && d.getNamespaceExport() === undefined;
}

/** Every static import and re-export of the file that names a module. */
export function moduleRefs(sf: SourceFile): ModuleRef[] {
  const decls: Decl[] = [...sf.getImportDeclarations(), ...sf.getExportDeclarations()];
  return decls.flatMap((decl) => {
    const spec = decl.getModuleSpecifierValue();
    if (spec === undefined) return [];
    const bindings = Node.isImportDeclaration(decl) ? importBindings(decl) : exportBindings(decl);
    const star =
      Node.isExportDeclaration(decl) &&
      !decl.hasNamedExports() &&
      decl.getNamespaceExport() === undefined;
    return [{ decl, spec, bindings, named: splittable(decl) && bindings.length > 0, star }];
  });
}

const bindingText = (b: Binding, asType: boolean): string => {
  const head = b.isType && !asType ? `type ${b.name}` : b.name;
  return b.alias === undefined ? head : `${head} as ${b.alias}`;
};

/** `import { a, type B as C } from 'spec';` (or `export …` for a re-export), one line. */
export function declText(ref: {
  kind: 'import' | 'export';
  spec: string;
  bindings: Binding[];
}): string {
  const asType = ref.bindings.every((b) => b.isType);
  const names = ref.bindings.map((b) => bindingText(b, asType)).join(', ');
  return `${ref.kind}${asType ? ' type' : ''} { ${names} } from '${ref.spec}';`;
}

/** `export * from 'spec';` or a named declaration. */
export const lineText = (line: {
  kind: 'import' | 'export';
  spec: string;
  bindings: Binding[];
  star: boolean;
}): string => (line.star ? `export * from '${line.spec}';` : declText(line));

export const kindOf = (decl: Decl): 'import' | 'export' =>
  Node.isImportDeclaration(decl) ? 'import' : 'export';
