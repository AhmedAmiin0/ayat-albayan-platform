import ts from 'typescript';
import { parseFile } from '../../model/source.ts';

interface Own {
  name: string;
  moved: ReadonlySet<string>;
}

const element = (e: ts.ExportSpecifier): string => e.getText().replace(/^type\s+/, '');

const specOf = (s: ts.ExportDeclaration): string =>
  s.moduleSpecifier !== undefined && ts.isStringLiteral(s.moduleSpecifier)
    ? s.moduleSpecifier.text
    : '';

/** `export { … } from './Name'`, the one export the step may split. */
function ownExport(s: ts.Statement, spec: string): ts.ExportDeclaration | undefined {
  if (!ts.isExportDeclaration(s) || specOf(s) !== spec) return undefined;
  return s.exportClause !== undefined && ts.isNamedExports(s.exportClause) ? s : undefined;
}

function split(s: ts.ExportDeclaration, own: Own, sf: ts.SourceFile): string {
  const spec = `./${own.name}`;
  const all =
    s.exportClause !== undefined && ts.isNamedExports(s.exportClause)
      ? [...s.exportClause.elements]
      : [];
  const moving = all.filter((e) => own.moved.has(e.name.text));
  if (moving.length === 0) return s.getText(sf);
  const staying = all.filter((e) => !moving.includes(e)).map((e) => e.getText(sf));
  const kind = s.isTypeOnly ? 'type ' : '';
  return [
    ...(staying.length === 0 ? [] : [`export ${kind}{ ${staying.join(', ')} } from '${spec}';`]),
    `export type { ${moving.map(element).join(', ')} } from '${spec}.types';`,
  ].join('\n');
}

/** The folder's index.ts with moved type exports taken from `./Name.types` instead of `./Name`. */
export function reexportTypes(path: string, text: string, own: Own): string {
  const sf = parseFile(path, text);
  const lines = sf.statements.map((s) => {
    const found = ownExport(s, `./${own.name}`);
    return found === undefined ? s.getText(sf) : split(found, own, sf);
  });
  const same = lines.every((l, i) => l === sf.statements[i]?.getText(sf));
  return same ? text : `${lines.join('\n')}\n`;
}
