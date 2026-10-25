import { Node, type Project } from 'ts-morph';
import { posix } from 'node:path';
import type { BarrelEntry } from './map.ts';
import { readText } from './files.ts';

const isTypeOnly = (decls: Node[]): boolean =>
  decls.every((d) => Node.isInterfaceDeclaration(d) || Node.isTypeAliasDeclaration(d));

/** `export { a, type B } from './x';`, wrapped like prettier (printWidth 100) when it is long. */
function exportLine(names: string[], spec: string): string {
  const one = `export { ${names.join(', ')} } from '${spec}';`;
  if (one.length <= 100) return one;
  return `export {\n${names.map((n) => `  ${n},`).join('\n')}\n} from '${spec}';`;
}

/** The public API of a folder: named re-exports of the listed files only (no `export *`). */
export function barrelText(project: Project, root: string, barrel: BarrelEntry): string {
  const lines = barrel.files.map((name) => {
    const file = posix.join(barrel.dir, name);
    const sf = project.createSourceFile(`/virtual/${file}`, readText(root, file), { overwrite: true });
    const decls = sf.getExportedDeclarations();
    const names = sf
      .getExportSymbols()
      .map((s) => s.getName())
      .filter((n) => n !== 'default')
      .map((n) => (isTypeOnly(decls.get(n) ?? []) && decls.has(n) ? `type ${n}` : n))
      .sort((a, b) => a.replace(/^type /, '').localeCompare(b.replace(/^type /, '')));
    project.removeSourceFile(sf);
    return exportLine(names, `./${name.replace(/\.[cm]?[jt]sx?$/, '')}`);
  });
  return `${lines.join('\n')}\n`;
}
