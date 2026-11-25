import { posix } from 'node:path';
import type ts from 'typescript';
import type { TypesInput, TypesVerdict } from './types.types.ts';
import { componentsOf } from '../../model/components.ts';
import { applyEdits } from '../../model/edits.ts';
import { emitImports, importedNames, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { parseFile } from '../../model/source.ts';
import { exportedText, isTypeDecl, readsValue, valueNames, type TypeDecl } from './declarations.ts';
import { reexportTypes } from './index-exports.ts';
import { propsPlan, type PropsPlan } from './props-plan.ts';
import { typesFileText, viewText } from './types-file.ts';

const refuse = (why: string): TypesVerdict => ({ result: 'refused', why });

interface Move {
  input: TypesInput;
  sf: ts.SourceFile;
  decls: TypeDecl[];
  props: PropsPlan;
  moved: Set<string>;
}

function refusal(m: Move): string | undefined {
  if (readsValue([...m.decls, ...m.props.nodes], valueNames(m.sf)))
    return 'a type reads a value of the file';
  const byPath = m.input.outside.find((o) => o.names.some((n) => m.moved.has(n)));
  return byPath === undefined ? undefined : `a type is imported by path from ${byPath.file}`;
}

function typesFileOf(m: Move, typesPath: string): string {
  const existing = m.input.files[typesPath] ?? '';
  const already = importedNames(importsOf(parseFile(typesPath, existing)));
  const reads = readsAny([...m.decls, ...m.props.nodes]);
  const needed = new Set([...reads].filter((n) => !already.has(n) && !m.moved.has(n)));
  const imports = emitImports(importsOf(m.sf), needed, { keepSideEffects: false, typesOnly: true });
  const decls = [...m.decls.map((d) => exportedText(d, m.sf)), ...m.props.texts];
  return typesFileText({ existing, imports, decls });
}

function filesOf(m: Move): Record<string, string> {
  const { input } = m;
  const dir = posix.dirname(input.path);
  const typesPath = `${dir}/${input.name}.types.ts`;
  const removals = m.decls.map((d) => ({ start: d.getFullStart(), end: d.getEnd(), value: '' }));
  const text = applyEdits(input.text, [...removals, ...m.props.edits]);
  const indexPath = `${dir}/index.ts`;
  const index = input.files[indexPath];
  const at = { name: input.name, moved: m.moved };
  return {
    [input.path]: viewText(text, input.path, at),
    [typesPath]: typesFileOf(m, typesPath),
    ...(index === undefined ? {} : { [indexPath]: reexportTypes(indexPath, index, at) }),
  };
}

/** Step 2 (docs/63 §4): every type of `Name.tsx` moves to `Name.types.ts`. */
export function typesStep(input: TypesInput): TypesVerdict {
  const sf = parseFile(input.path, input.text);
  const c = componentsOf(sf).find((x) => x.name === input.name);
  if (c === undefined) return refuse(`no component ${input.name}`);
  const decls = sf.statements.filter(isTypeDecl);
  const own = importsOf(sf).filter((d) => d.spec === `./${input.name}.types`);
  const local = new Set([...decls.map((d) => d.name.text), ...importedNames(own)]);
  const props = propsPlan(c, { sf, local });
  const m = {
    input,
    sf,
    decls,
    props,
    moved: new Set([...decls.map((d) => d.name.text), ...props.moved]),
  };
  if (m.moved.size === 0) return { result: 'none' };
  const why = refusal(m);
  return why === undefined ? { result: 'typed', files: filesOf(m) } : refuse(why);
}
