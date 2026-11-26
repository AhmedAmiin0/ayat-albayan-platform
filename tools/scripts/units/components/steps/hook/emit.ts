import ts from 'typescript';
import type { Shape } from './hook.types.ts';
import { applyEdits } from '../../model/edits.ts';
import { emitImports, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { kebabOf } from '../../model/source.ts';

export const hookFileOf = (name: string): string => `use-${kebabOf(name)}`;

const textOf = (n: ts.Node, sf: ts.SourceFile): string =>
  sf.text.slice(n.getFullStart(), n.getEnd()).replace(/^\n+/, '');

const indent = (lines: string): string => lines.replace(/^(?!$)/gm, '  ');

const typeParams = (fn: ts.FunctionLikeDeclaration, sf: ts.SourceFile): string =>
  fn.typeParameters === undefined
    ? ''
    : `<${fn.typeParameters.map((t) => t.getText(sf)).join(', ')}>`;

const paramNodes = (s: Shape): ts.Node[] => [...s.fn.parameters, ...(s.fn.typeParameters ?? [])];

/** `use-name.ts`: the setup, the hoists and one returned object. */
export function hookText(s: Shape, name: string): string {
  const params = s.inputs.param === '' ? [] : paramNodes(s);
  const reads = readsAny([...s.setup, ...s.moved, ...params, ...s.hoists.map((h) => h.call)]);
  const imports = emitImports(importsOf(s.sf), reads, { keepSideEffects: false });
  const body = [
    ...s.setup.map((n) => textOf(n, s.sf)),
    ...s.hoists.map((h) => h.text),
    `return { ${s.outputs.join(', ')} };`,
  ];
  return [
    ...imports,
    '',
    ...s.moved.map((n) => textOf(n, s.sf)),
    `export function use${name}${typeParams(s.fn, s.sf)}(${s.inputs.param}) {`,
    indent(body.join('\n')),
    '}',
    '',
  ].join('\n');
}

/** With no props to infer from, the view names the hook's type arguments itself. */
const typeArgs = (s: Shape): string =>
  s.inputs.param === '' && s.fn.typeParameters !== undefined
    ? `<${s.fn.typeParameters.map((t) => t.name.text).join(', ')}>`
    : '';

function viewBody(s: Shape, name: string): string {
  const call = `use${name}${typeArgs(s)}(${s.inputs.arg})`;
  const own = s.outputs.length === 0 ? `${call};` : `const { ${s.outputs.join(', ')} } = ${call};`;
  const lines = [
    ...(s.theme === undefined ? [] : [textOf(s.theme, s.sf)]),
    own,
    ...s.guards.map((g) => textOf(g, s.sf)),
    `return ${s.ret.getText(s.sf)};`,
  ];
  return `{\n${indent(lines.join('\n'))}\n}`;
}

/** `Name.tsx`: the imports it still reads, the call to its hook, the guards and the JSX. */
export function viewText(s: Shape, name: string): string {
  const imports = s.sf.statements.filter(ts.isImportDeclaration);
  const body = s.fn.body as ts.Node;
  const kept = s.sf.statements.filter(
    (st) => !ts.isImportDeclaration(st) && !s.moved.includes(st) && st !== s.statement,
  );
  const theme = s.theme === undefined ? [] : [s.theme];
  const header = [...paramNodes(s), ...(s.fn.type === undefined ? [] : [s.fn.type])];
  const reads = readsAny([...kept, ...header, ...s.guards, s.ret, ...theme]);
  const lines = [
    ...emitImports(importsOf(s.sf), reads, { keepSideEffects: true }),
    `import { use${name} } from './${hookFileOf(name)}';`,
  ];
  const block = lines.join('\n');
  const out = applyEdits(s.sf.text, [
    ...imports.map((d, i) => ({
      start: i === 0 ? d.getStart(s.sf) : d.getFullStart(),
      end: d.getEnd(),
      value: i === 0 ? block : '',
    })),
    ...s.moved.map((m) => ({ start: m.getFullStart(), end: m.getEnd(), value: '' })),
    { start: body.getStart(s.sf), end: body.getEnd(), value: viewBody(s, name) },
  ]);
  return imports.length === 0 ? `${block}\n\n${out.replace(/^\n+/, '')}` : out;
}
