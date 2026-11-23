import { posix } from 'node:path';
import { Node } from 'ts-morph';
import type { BarrelUse, ExtStyle } from './write.types.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';

const WIDTH = 100;
const CODE_EXT = /\.[cm]?[jt]sx?$/;

const SPECS: Record<ExtStyle, (name: string) => string> = {
  bare: (name) => name.replace(CODE_EXT, ''),
  exact: (name) => name,
  js: (name) => `${name.replace(CODE_EXT, '')}.js`,
};

const isTypeDecl = (d: Node): boolean =>
  Node.isInterfaceDeclaration(d) || Node.isTypeAliasDeclaration(d);

/** Names the file declares as types only (interfaces and type aliases). */
function typeNames(file: string, text: string): Set<string> {
  const project = newProject();
  const sf = project.createSourceFile(`/virtual/${file}`, text);
  const decls = [...sf.getExportedDeclarations()];
  return new Set(decls.filter(([, ds]) => ds.length > 0 && ds.every(isTypeDecl)).map(([n]) => n));
}

/** `export { a, type B } from './x';`, wrapped like prettier when it is too long. */
function exportLine(names: string[], spec: string): string {
  const one = `export { ${names.join(', ')} } from '${spec}';`;
  return one.length <= WIDTH
    ? one
    : `export {\n${names.map((n) => `  ${n},`).join('\n')}\n} from '${spec}';`;
}

/** The unit's index.ts: one export line per unit file, export-only, no logic. */
export function barrelText(use: BarrelUse, read: (file: string) => string): string {
  const files = [...use.files].sort(([a], [b]) => a.localeCompare(b));
  const lines = files.map(([file, names]) => {
    const types = typeNames(file, read(file));
    const list = [...names]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, typeOnly]) => (typeOnly || types.has(name) ? `type ${name}` : name));
    return exportLine(list, `./${SPECS[use.style](posix.basename(file))}`);
  });
  return `${lines.join('\n')}\n`;
}
