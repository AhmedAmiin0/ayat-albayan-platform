import { Node, type ExportDeclaration, type ImportDeclaration, type SourceFile } from 'ts-morph';
import type { NameUse, SpecUse } from './write.types.ts';
import { specifierNodes } from '../../ci-checks/move-module/specifiers.ts';

const DEFAULT = 'default';

const usable = (names: NameUse[]): NameUse[] | undefined =>
  names.length > 0 && names.every((n) => n.name !== DEFAULT) ? names : undefined;

function importNames(d: ImportDeclaration): NameUse[] | undefined {
  if (d.getDefaultImport() !== undefined || d.getNamespaceImport() !== undefined) return undefined;
  const whole = d.isTypeOnly();
  return usable(
    d.getNamedImports().map((e) => ({ name: e.getName(), typeOnly: whole || e.isTypeOnly() })),
  );
}

function exportNames(d: ExportDeclaration): NameUse[] | undefined {
  if (d.isNamespaceExport()) return undefined;
  const whole = d.isTypeOnly();
  return usable(
    d.getNamedExports().map((e) => ({ name: e.getName(), typeOnly: whole || e.isTypeOnly() })),
  );
}

/** Specifier start → the names its declaration imports or re-exports by name. */
function namedSpecs(sf: SourceFile): Map<number, NameUse[]> {
  const out = new Map<number, NameUse[]>();
  for (const s of sf.getStatements()) {
    const names = namesOf(s);
    const spec =
      Node.isImportDeclaration(s) || Node.isExportDeclaration(s)
        ? s.getModuleSpecifier()
        : undefined;
    if (names !== undefined && spec !== undefined) out.set(spec.getStart() + 1, names);
  }
  return out;
}

function namesOf(s: Node): NameUse[] | undefined {
  if (Node.isImportDeclaration(s)) return importNames(s);
  return Node.isExportDeclaration(s) ? exportNames(s) : undefined;
}

/** Every module path of the file (move-module/specifiers.ts), with names where they are named. */
export function specUses(sf: SourceFile): SpecUse[] {
  const named = namedSpecs(sf);
  return specifierNodes(sf).map((s) => {
    const names = named.get(s.start);
    return names === undefined ? s : { ...s, names };
  });
}
