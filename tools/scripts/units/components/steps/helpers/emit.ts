import type ts from 'typescript';
import { emitImports, importsOf } from '../../model/imports.ts';
import { groupBy } from '../../model/group.ts';
import { declaredNames, readsAny } from '../../model/names.ts';
import type { ImportDecl } from '../../model/model.types.ts';

/** `export …` with the declaration's own leading comment kept above it. */
export function exportedDecl(s: ts.Statement, sf: ts.SourceFile): string {
  const lead = sf.text.slice(s.getFullStart(), s.getStart(sf)).trim();
  const body = s.getText(sf).replace(/^export\s+/, '');
  return `${lead === '' ? '' : `${lead}\n`}export ${body}`;
}

interface FileAt {
  sf: ts.SourceFile;
  decls: readonly ts.Statement[];
  /** Name → the sibling file stem it lives in once moved. */
  homes: ReadonlyMap<string, string>;
  stem: string;
}

/** Imports for `decls`: from the component's own imports, and from sibling target files. */
function importLines({ decls, homes, stem }: FileAt, imports: readonly ImportDecl[]): string[] {
  const reads = readsAny(decls);
  const own = new Set(decls.flatMap(declaredNames));
  const siblings = [...homes].filter(([n, home]) => reads.has(n) && home !== stem && !own.has(n));
  const byHome = groupBy(siblings, ([, home]) => home);
  return [
    ...emitImports(imports, reads, { keepSideEffects: false }),
    ...[...byHome].map(
      ([home, rows]) => `import { ${rows.map(([n]) => n).join(', ')} } from './${home}';`,
    ),
  ];
}

/** One moved-to file: its imports, then every declaration exported. */
export function targetText(at: FileAt): string {
  const lines = importLines(at, importsOf(at.sf));
  const body = at.decls.map((d) => exportedDecl(d, at.sf)).join('\n\n');
  return `${[...lines, ...(lines.length === 0 ? [] : ['']), body].join('\n')}\n`;
}
