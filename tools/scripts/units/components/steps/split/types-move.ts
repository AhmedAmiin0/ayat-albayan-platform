import { posix } from 'node:path';
import ts from 'typescript';
import { emitImports, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { no, ok } from '../../model/result.ts';
import { parseFile } from '../../model/source.ts';
import { repoint } from './specs.ts';
import type { Result } from '../../model/model.types.ts';
import type { TypesMove } from './split.types.ts';

const typeName = (s: ts.Statement): string | undefined =>
  ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s)
    ? s.name.text
    : undefined;

interface At {
  path: string;
  text: string;
  subDir: string;
  owner: string;
}

const linesFor = (sf: ts.SourceFile, nodes: readonly ts.Node[], dirs: [string, string]) =>
  emitImports(
    importsOf(sf).map((d) => repoint(d, dirs[0], dirs[1])),
    readsAny(nodes),
    { keepSideEffects: false, typesOnly: true },
  );

const join = (imports: string[], body: string[]): string =>
  `${[...(imports.length === 0 ? [] : [imports.join('\n')]), ...body].join('\n\n')}\n`;

/** Moves the declarations of `names` out of `Name.types.ts`; refused when one stays needed. */
export function moveTypes(at: At, names: ReadonlySet<string>): Result<TypesMove> {
  const sf = parseFile(at.path, at.text);
  const decls = sf.statements.filter((s) => typeName(s) !== undefined);
  const moved = decls.filter((s) => names.has(typeName(s) ?? ''));
  const missing = [...names].find((n) => !moved.some((s) => typeName(s) === n));
  if (missing !== undefined) return no(`${missing} is not declared in ${posix.basename(at.path)}`);
  const kept = decls.filter((s) => !moved.includes(s));
  const keptNames = new Set(kept.map((s) => typeName(s) ?? ''));
  const dep = [...readsAny(moved)].find((n) => keptNames.has(n));
  if (dep !== undefined) return no(`shares the type ${dep} with ${at.owner}`);
  const dir = posix.dirname(at.path);
  const rest = sf.statements.filter((s) => !ts.isImportDeclaration(s) && !moved.includes(s));
  return ok({
    parent: join(
      linesFor(sf, rest, [dir, dir]),
      rest.map((s) => s.getFullText(sf).trim()),
    ),
    sub: join(
      linesFor(sf, moved, [dir, at.subDir]),
      moved.map((s) => s.getFullText(sf).trim()),
    ),
  });
}
