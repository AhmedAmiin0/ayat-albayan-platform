import { posix } from 'node:path';
import ts from 'typescript';
import type { HookInput, HookVerdict, Shape } from './hook.types.ts';
import { componentsOf, type Component } from '../../model/components.ts';
import { applyEdits } from '../../model/edits.ts';
import { importedNames, importsOf } from '../../model/imports.ts';
import { declaredNames, readsAny } from '../../model/names.ts';
import { partsOf, type Parts } from '../../model/parts.ts';
import { calleeName, parseFile } from '../../model/source.ts';
import { hookFileOf, hookText, viewText } from './emit.ts';
import { hoistsOf } from './hoist.ts';
import { inputsOf } from './inputs.ts';
import { readsCurrent, refRenames, renameEdits } from './refs.ts';
import { ownHookCalls, refusalOf } from './refusals.ts';

const refuse = (why: string): HookVerdict => ({ result: 'refused', why });

interface Pass {
  sf: ts.SourceFile;
  c: Component;
  parts: Parts;
}

function pass(path: string, text: string, name: string): Pass | undefined {
  const sf = parseFile(path, text);
  const c = componentsOf(sf).find((x) => x.name === name);
  return c?.fn.body === undefined ? undefined : { sf, c, parts: partsOf(c.fn.body) };
}

const view = (p: Parts): ts.Node[] => [...p.guards, ...(p.ret === undefined ? [] : [p.ret])];

/** Pass 1: refs renamed to `xRef`; refused when the view reads `.current`. */
function renamedRefs(input: HookInput, first: Pass): string | HookVerdict {
  const renames = refRenames(first.parts.setup);
  const refs = new Set([...renames.keys(), ...renames.values()]);
  if (readsCurrent(view(first.parts), refs)) return refuse('the JSX reads a ref (.current)');
  return applyEdits(input.text, renameEdits(first.c.fn, renames, first.sf));
}

/** Pass 2: hook calls in the JSX replaced by consts the hook returns. */
function hoisted(
  path: string,
  text: string,
  second: Pass,
): { text: string; hoists: Shape['hoists'] } | HookVerdict {
  const { setup, guards, ret } = second.parts;
  const taken = new Set([...setup.flatMap(declaredNames), ...importedNames(importsOf(second.sf))]);
  const calls = view(second.parts).flatMap(ownHookCalls);
  const found = hoistsOf(calls, { ret: ret ?? second.c.fn, guarded: guards.length > 0, taken });
  if (!Array.isArray(found)) return refuse(found.refused);
  const edits = found.map((h) => ({
    start: h.call.getStart(second.sf),
    end: h.call.getEnd(),
    value: h.name,
  }));
  const lines = found.map((h) => `const ${h.name} = ${h.call.getText(second.sf)};`);
  const out = applyEdits(text, edits);
  const third = parseFile(path, lines.join('\n'));
  const hoists = found.map((h, i) => ({
    name: h.name,
    text: lines[i] ?? '',
    call: third.statements[i] ?? third,
  }));
  return { text: out, hoists };
}

const isTheme = (s: ts.Statement): boolean =>
  ts.isVariableStatement(s) &&
  s.declarationList.declarations.some(
    (d) =>
      d.initializer !== undefined &&
      ts.isCallExpression(d.initializer) &&
      calleeName(d.initializer) === 'useTheme',
  );

/** Pass 3: what moves, what stays, what the hook takes and returns. */
function shapeOf(third: Pass, hoists: Shape['hoists']): Shape | HookVerdict {
  const { sf, c, parts } = third;
  if (parts.ret === undefined) return refuse('no final return');
  const theme = parts.setup.find(isTheme);
  const rest = parts.setup.filter((s) => s !== theme);
  const restReads = readsAny([...rest, ...hoists.map((h) => h.call)]);
  const themeMoves = theme !== undefined && declaredNames(theme).some((n) => restReads.has(n));
  const setup = themeMoves ? parts.setup : rest;
  const others = sf.statements.filter((s) => !ts.isImportDeclaration(s) && s !== c.statement);
  const viewReads = readsAny([
    ...parts.guards,
    parts.ret,
    ...(themeMoves || theme === undefined ? [] : [theme]),
  ]);
  const readElsewhere = (s: ts.Statement): Set<string> =>
    readsAny([...others.filter((o) => o !== s), ...c.fn.parameters]);
  const onlySetupReads = (s: ts.Statement): boolean => {
    const elsewhere = readElsewhere(s);
    const names = declaredNames(s);
    return names.length > 0 && names.every((n) => !viewReads.has(n) && !elsewhere.has(n));
  };
  const moved = others.filter(onlySetupReads);
  const leftover = others.find(
    (s) => !moved.includes(s) && declaredNames(s).some((n) => restReads.has(n)),
  );
  if (leftover !== undefined)
    return refuse('top-level code the JSX also reads (helpers step first)');
  const declared = [...setup.flatMap(declaredNames), ...hoists.map((h) => h.name)];
  const outputs = declared.filter((n) => viewReads.has(n));
  const inputs = inputsOf(c.fn, readsAny([...setup, ...moved, ...hoists.map((h) => h.call)]));
  if ('refused' in inputs) return refuse(inputs.refused);
  return {
    sf,
    fn: c.fn,
    statement: c.statement,
    setup,
    theme: themeMoves ? undefined : theme,
    hoists,
    guards: parts.guards,
    ret: parts.ret,
    moved,
    outputs,
    inputs,
  };
}

/** Already converted: one call to its own hook from `./use-name`, nothing else to move. */
function isDone(input: HookInput, first: Pass, calls: readonly ts.CallExpression[]): boolean {
  const own = `use${input.name}`;
  const local = importsOf(first.sf).some(
    (d) => d.spec === `./${hookFileOf(input.name)}` && d.named.some((n) => n.local === own),
  );
  const onlyOwn = calls.length === 1 && calls.every((c) => calleeName(c) === own);
  return local && onlyOwn && first.parts.setup.every((s) => isTheme(s) || ownCall(s, own));
}

const ownCall = (s: ts.Statement, own: string): boolean =>
  (ts.isVariableStatement(s) &&
    s.declarationList.declarations.every(
      (d) =>
        d.initializer !== undefined &&
        ts.isCallExpression(d.initializer) &&
        calleeName(d.initializer) === own,
    )) ||
  (ts.isExpressionStatement(s) &&
    ts.isCallExpression(s.expression) &&
    calleeName(s.expression) === own);

function precondition(input: HookInput, first: Pass): string | undefined {
  if (!input.tested) return 'untested (Q2, its test commit comes first)';
  const own = `use${input.name}`;
  const clash =
    input.folder.includes(`${hookFileOf(input.name)}.ts`) ||
    importedNames(importsOf(first.sf)).has(own);
  return clash ? `a same-name hook ${own} exists (adopt step)` : undefined;
}

/** Step 5 (docs/63 §4): the component's logic moves into `use-name.ts`, or why it cannot. */
export function hookStep(input: HookInput): HookVerdict {
  const first = pass(input.path, input.text, input.name);
  if (first === undefined) return refuse(`no component ${input.name} with a body`);
  const calls = ownHookCalls(first.c.fn);
  if (calls.length === 0) return { result: 'no-hook' };
  if (isDone(input, first, calls)) return { result: 'done' };
  const why =
    refusalOf(first.sf, componentsOf(first.sf), first.c, first.parts) ?? precondition(input, first);
  if (why !== undefined) return refuse(why);
  const renamed = renamedRefs(input, first);
  if (typeof renamed !== 'string') return renamed;
  const second = pass(input.path, renamed, input.name);
  if (second === undefined) return refuse('the refs pass lost the component');
  const lifted = hoisted(input.path, renamed, second);
  if ('result' in lifted) return lifted;
  const third = pass(input.path, lifted.text, input.name);
  if (third === undefined) return refuse('the hoist pass lost the component');
  const shape = shapeOf(third, lifted.hoists);
  if ('result' in shape) return shape;
  const hook = `${posix.dirname(input.path)}/${hookFileOf(input.name)}.ts`;
  return {
    result: 'hooked',
    files: { [input.path]: viewText(shape, input.name), [hook]: hookText(shape, input.name) },
  };
}
