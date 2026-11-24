import { Node, type ExportDeclaration, type ImportDeclaration } from 'ts-morph';
import type { Decl, Named } from './types.ts';

export const FACADE = '@ab/shared';
const WIDTH = 100;

const TYPE = 'type ';
const isTyped = (e: string): boolean => e.startsWith(TYPE);
const untyped = (e: string): string => (isTyped(e) ? e.slice(TYPE.length) : e);

/**
 * `import { a, type B } from 'x';`, wrapped one name per line past the print width. All names
 * inline types: one `import type { … }`, since an inline-only import is kept at runtime.
 */
export function statementText(s: Omit<Named, 'decl' | 'elements'>, elements: string[]): string {
  const typeOnly = s.typeOnly || elements.every(isTyped);
  const names = typeOnly ? elements.map(untyped) : elements;
  const head = `${s.keyword}${typeOnly ? ' type' : ''} {`;
  const one = `${head} ${names.join(', ')} } from '${s.spec}';`;
  if (one.length <= WIDTH) return one;
  return `${head}\n${names.map((e) => `  ${e},`).join('\n')}\n} from '${s.spec}';`;
}

function importNamed(decl: ImportDeclaration): Named | undefined {
  const plain = decl.getDefaultImport() === undefined && decl.getNamespaceImport() === undefined;
  const named = decl.getNamedImports();
  if (!plain || named.length === 0) return undefined;
  return {
    decl,
    keyword: 'import',
    typeOnly: decl.isTypeOnly(),
    spec: decl.getModuleSpecifierValue(),
    elements: named.map((e) => ({
      text: e.getText(),
      name: e.getName(),
      alias: e.getAliasNode()?.getText(),
    })),
  };
}

function exportNamed(decl: ExportDeclaration): Named | undefined {
  const spec = decl.getModuleSpecifierValue();
  const named = decl.getNamedExports();
  if (spec === undefined || named.length === 0) return undefined;
  return {
    decl,
    keyword: 'export',
    typeOnly: decl.isTypeOnly(),
    spec,
    elements: named.map((e) => ({
      text: e.getText(),
      name: e.getName(),
      alias: e.getAliasNode()?.getText(),
    })),
  };
}

/** The named form of an import or export-from; undefined for default, namespace and `*`. */
export const namedOf = (decl: Decl): Named | undefined =>
  Node.isImportDeclaration(decl) ? importNamed(decl) : exportNamed(decl);

/** The span of `decl`, or of `decl` and its line break when it is removed. */
export function spanOf(decl: Decl, removed: boolean): { start: number; end: number } {
  const end = decl.getEnd();
  const eol = removed && decl.getSourceFile().getFullText()[end] === '\n' ? 1 : 0;
  return { start: decl.getStart(), end: end + eol };
}

export function pushTo(map: Map<string, string[]>, key: string, ...values: string[]): void {
  map.set(key, [...(map.get(key) ?? []), ...values]);
}

export const isInlineType = (e: Named['elements'][number]): boolean => e.text.startsWith('type ');
