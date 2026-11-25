import ts from 'typescript';
import { parseFile } from '../../model/source.ts';

const element = (e: ts.ExportSpecifier): string => e.getText().replace(/^type\s+/, '');

/** The folder's index.ts with `moved` type exports taken from `./Name.types` instead of `./Name`. */
export function reexportTypes(
  path: string,
  text: string,
  at: { name: string; moved: ReadonlySet<string> },
): string {
  const sf = parseFile(path, text);
  const own = `./${at.name}`;
  const lines = sf.statements.map((s) => {
    const spec =
      ts.isExportDeclaration(s) &&
      s.moduleSpecifier !== undefined &&
      ts.isStringLiteral(s.moduleSpecifier)
        ? s.moduleSpecifier.text
        : '';
    if (
      spec !== own ||
      !ts.isExportDeclaration(s) ||
      s.exportClause === undefined ||
      !ts.isNamedExports(s.exportClause)
    )
      return s.getText(sf);
    const all = [...s.exportClause.elements];
    const moving = all.filter((e) => at.moved.has(e.name.text));
    if (moving.length === 0) return s.getText(sf);
    const staying = all.filter((e) => !moving.includes(e));
    return [
      ...(staying.length === 0
        ? []
        : [
            `export ${s.isTypeOnly ? 'type ' : ''}{ ${staying.map((e) => e.getText(sf)).join(', ')} } from '${own}';`,
          ]),
      `export type { ${moving.map(element).join(', ')} } from '${own}.types';`,
    ].join('\n');
  });
  return `${lines.join('\n')}\n`;
}
