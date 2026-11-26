import { posix } from 'node:path';
import ts from 'typescript';
import { applyEdits } from '../../model/edits.ts';
import { emitImports, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { parseFile } from '../../model/source.ts';
import { repoint } from './specs.ts';
import type { Component } from '../../model/model.types.ts';

interface SubAt {
  sf: ts.SourceFile;
  sub: Component;
  dir: string;
  typesSpec: string;
}

const exported = (s: ts.Statement, sf: ts.SourceFile): string => {
  const lead = sf.text.slice(s.getFullStart(), s.getStart(sf)).trim();
  return `${lead === '' ? '' : `${lead}\n`}export ${s.getText(sf)}`;
};

/** `Sub/Sub.tsx`: the imports it reads, re-pointed one folder down, and the exported component. */
export function subText(at: SubAt, types: readonly string[]): string {
  const subDir = `${at.dir}/${at.sub.name}`;
  const decls = importsOf(at.sf)
    .filter((d) => d.spec !== at.typesSpec)
    .map((d) => repoint(d, at.dir, subDir));
  const lines = [
    ...emitImports(decls, readsAny([at.sub.statement]), { keepSideEffects: false }),
    ...(types.length === 0
      ? []
      : [`import type { ${types.join(', ')} } from './${at.sub.name}.types';`]),
  ];
  return `${lines.join('\n')}\n\n${exported(at.sub.statement, at.sf)}\n`;
}

/** `Name.tsx` without the sub-components, importing each from its folder. */
export function parentText(path: string, text: string, subs: readonly string[]): string {
  const sf = parseFile(path, text);
  const gone = new Set(subs);
  const isSub = (s: ts.Statement): boolean =>
    (ts.isFunctionDeclaration(s) && gone.has(s.name?.text ?? '')) ||
    (ts.isVariableStatement(s) &&
      s.declarationList.declarations.some((d) => gone.has(d.name.getText(sf))));
  const removed = sf.statements.filter((s) => ts.isImportDeclaration(s) || isSub(s));
  const rest = sf.statements.filter((s) => !removed.includes(s));
  const lines = [
    ...emitImports(importsOf(sf), readsAny(rest), { keepSideEffects: true }),
    ...subs.map((n) => `import { ${n} } from './${n}';`),
  ];
  const body = applyEdits(
    text,
    removed.map((s) => ({ start: s.getFullStart(), end: s.getEnd(), value: '' })),
  ).replace(/^\s+/, '');
  return `${lines.join('\n')}\n\n${body}`;
}

export const indexText = (name: string): string => `export { ${name} } from './${name}';\n`;

export const subPathOf = (path: string, name: string): string =>
  `${posix.dirname(path)}/${name}/${name}.tsx`;
