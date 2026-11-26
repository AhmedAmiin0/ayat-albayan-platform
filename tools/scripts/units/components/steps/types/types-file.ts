import ts from 'typescript';
import { applyEdits } from '../../model/edits.ts';
import { emitImports, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { parseFile } from '../../model/source.ts';

interface TypesFile {
  existing: string;
  imports: string[];
  decls: string[];
}

const fresh = (imports: string[], body: string): string =>
  `${[...imports, ...(imports.length === 0 ? [] : ['']), body].join('\n')}\n`;

/** New imports go after the file's last import, or open the file when it has none. */
function withImports(existing: string, imports: string[]): string {
  if (imports.length === 0) return existing.trimEnd();
  const last = parseFile('x.types.ts', existing).statements.filter(ts.isImportDeclaration).at(-1);
  const lines = imports.join('\n');
  if (last === undefined) return `${lines}\n\n${existing.trimEnd()}`;
  return `${existing.slice(0, last.getEnd())}\n${lines}${existing.slice(last.getEnd()).trimEnd()}`;
}

/** `Name.types.ts`: its own text and imports, then the new imports, the new declarations last. */
export function typesFileText({ existing, imports, decls }: TypesFile): string {
  const body = decls.join('\n\n');
  if (existing.trim() === '') return fresh(imports, body);
  return `${withImports(existing, imports)}\n\n${body}\n`;
}

/** `Name.tsx` after the move: the imports it still reads and the types from `./Name.types`. */
export function viewText(
  text: string,
  path: string,
  at: { name: string; moved: ReadonlySet<string> },
): string {
  const sf = parseFile(path, text);
  const own = `./${at.name}.types`;
  const decls = importsOf(sf);
  const reads = readsAny(sf.statements.filter((s) => !ts.isImportDeclaration(s)));
  const ownDecl = decls.find((d) => d.spec === own);
  const names = [...(ownDecl?.named.map((n) => n.local) ?? []), ...at.moved].filter((n) =>
    reads.has(n),
  );
  const typeLine =
    names.length === 0 ? [] : [`import type { ${[...new Set(names)].join(', ')} } from '${own}';`];
  const block = [
    ...emitImports(
      decls.filter((d) => d !== ownDecl),
      reads,
      { keepSideEffects: true },
    ),
    ...typeLine,
  ].join('\n');
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const edits = imports.map((d, i) => ({
    start: i === 0 ? d.getStart(sf) : d.getFullStart(),
    end: d.getEnd(),
    value: i === 0 ? block : '',
  }));
  const out = applyEdits(text, edits);
  return imports.length === 0 ? `${block}\n\n${out.replace(/^\n+/, '')}` : out;
}
