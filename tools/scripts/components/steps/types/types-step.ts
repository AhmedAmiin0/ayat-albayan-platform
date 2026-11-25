import { posix } from 'node:path';
import ts from 'typescript';
import type { TypesInput, TypesVerdict } from './types.types.ts';
import { componentsOf, type Component } from '../../model/components.ts';
import { applyEdits, type TextEdit } from '../../model/edits.ts';
import { emitImports, importedNames, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { parseFile } from '../../model/source.ts';
import { exportedText, isTypeDecl, readsValue, valueNames } from './declarations.ts';
import { reexportTypes } from './index-exports.ts';

const refuse = (why: string): TypesVerdict => ({ result: 'refused', why });

interface Plan {
  texts: string[];
  moved: Set<string>;
  edits: TextEdit[];
  nodes: ts.Node[];
}

/** The props parameter's type: an inline literal or a package type becomes `NameProps`. */
function propsPlan(c: Component, sf: ts.SourceFile, local: ReadonlySet<string>): Plan {
  const type = c.fn.parameters[0]?.type;
  const props = `${c.name}Props`;
  const empty: Plan = { texts: [], moved: new Set(), edits: [], nodes: [] };
  if (type === undefined || local.has(props)) return empty;
  const literal = ts.isTypeLiteralNode(type);
  const named =
    ts.isTypeReferenceNode(type) && !local.has(type.typeName.getText(sf).split('.')[0] ?? '');
  if (!literal && !(named && type.getText(sf) !== props)) return empty;
  const text = literal
    ? `export interface ${props} ${type.getText(sf)}`
    : `export type ${props} = ${type.getText(sf)};`;
  const edit = { start: type.getStart(sf), end: type.getEnd(), value: props };
  return { texts: [text], moved: new Set([props]), edits: [edit], nodes: [type] };
}

function typesFileText(existing: string, imports: string[], decls: string[]): string {
  if (existing.trim() === '')
    return `${[...imports, '', ...decls.join('\n\n').split('\n')].join('\n').replace(/^\n/, '')}\n`;
  const sf = parseFile('x.types.ts', existing);
  const last = sf.statements.filter(ts.isImportDeclaration).at(-1);
  const at = last?.getEnd() ?? 0;
  const head =
    imports.length === 0
      ? ''
      : `${last === undefined ? '' : '\n'}${imports.join('\n')}${last === undefined ? '\n\n' : ''}`;
  return `${existing.slice(0, at)}${head}${existing.slice(at).trimEnd()}\n\n${decls.join('\n\n')}\n`;
}

function viewText(
  text: string,
  path: string,
  at: { name: string; moved: ReadonlySet<string> },
): string {
  const sf = parseFile(path, text);
  const own = `./${at.name}.types`;
  const decls = importsOf(sf);
  const reads = readsAny(sf.statements.filter((s) => !ts.isImportDeclaration(s)));
  const ownDecl = decls.find((d) => d.spec === own);
  const typeNames = [...(ownDecl?.named.map((n) => n.local) ?? []), ...at.moved].filter((n) =>
    reads.has(n),
  );
  const lines = [
    ...emitImports(
      decls.filter((d) => d !== ownDecl),
      reads,
      { keepSideEffects: true },
    ),
    ...(typeNames.length === 0
      ? []
      : [`import type { ${[...new Set(typeNames)].join(', ')} } from '${own}';`]),
  ];
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const edits = imports.map((d, i) => ({
    start: i === 0 ? d.getStart(sf) : d.getFullStart(),
    end: d.getEnd(),
    value: i === 0 ? lines.join('\n') : '',
  }));
  const out = applyEdits(text, edits);
  return imports.length === 0 ? `${lines.join('\n')}\n\n${out.replace(/^\n+/, '')}` : out;
}

/** Step 2 (docs/63 §4): every type of `Name.tsx` moves to `Name.types.ts`. */
export function typesStep(input: TypesInput): TypesVerdict {
  const sf = parseFile(input.path, input.text);
  const c = componentsOf(sf).find((x) => x.name === input.name);
  if (c === undefined) return refuse(`no component ${input.name}`);
  const decls = sf.statements.filter(isTypeDecl);
  const local = new Set([
    ...decls.map((d) => d.name.text),
    ...importedNames(importsOf(sf).filter((d) => d.spec === `./${input.name}.types`)),
  ]);
  const props = propsPlan(c, sf, local);
  const moved = new Set([...decls.map((d) => d.name.text), ...props.moved]);
  if (moved.size === 0) return { result: 'none' };
  if (readsValue([...decls, ...props.nodes], valueNames(sf)))
    return refuse('a type reads a value of the file');
  const byPath = input.outside.find((o) => o.names.some((n) => moved.has(n)));
  if (byPath !== undefined) return refuse(`a type is imported by path from ${byPath.file}`);
  const dir = posix.dirname(input.path);
  const typesPath = `${dir}/${input.name}.types.ts`;
  const existing = input.files[typesPath] ?? '';
  const already = importedNames(importsOf(parseFile(typesPath, existing)));
  const needed = new Set(
    [...readsAny([...decls, ...props.nodes])].filter((n) => !already.has(n) && !moved.has(n)),
  );
  const imports = emitImports(importsOf(sf), needed, { keepSideEffects: false, typesOnly: true });
  const removals = decls.map((d) => ({ start: d.getFullStart(), end: d.getEnd(), value: '' }));
  const view = viewText(applyEdits(input.text, [...removals, ...props.edits]), input.path, {
    name: input.name,
    moved,
  });
  const indexPath = `${dir}/index.ts`;
  const index = input.files[indexPath];
  return {
    result: 'typed',
    files: {
      [input.path]: view,
      [typesPath]: typesFileText(existing, imports, [
        ...decls.map((d) => exportedText(d, sf)),
        ...props.texts,
      ]),
      ...(index === undefined
        ? {}
        : { [indexPath]: reexportTypes(indexPath, index, { name: input.name, moved }) }),
    },
  };
}
