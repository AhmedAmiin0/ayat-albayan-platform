import { posix } from 'node:path';
import type ts from 'typescript';
import type { HookInput, HookVerdict, Shape } from './hook.types.ts';
import { declaresCallTo, isCallStatement, isTheme } from '../../model/calls.ts';
import { componentsOf } from '../../model/components.ts';
import { importedNames, importsOf } from '../../model/imports.ts';
import { no, type Result } from '../../model/result.ts';
import { calleeName } from '../../model/source.ts';
import { hookFileOf, hookText, viewText } from './emit.ts';
import { hoisted, passOf, renamedRefs, type Pass } from './passes.ts';
import { ownHookCalls, refusalOf } from './refusals.ts';
import { shapeOf } from './shape.ts';

const refuse = (why: string): HookVerdict => ({ result: 'refused', why });

/** Already converted: one call to its own hook from `./use-name`, nothing else to move. */
function isDone(input: HookInput, first: Pass, calls: readonly ts.CallExpression[]): boolean {
  const own = `use${input.name}`;
  const local = importsOf(first.sf).some(
    (d) => d.spec === `./${hookFileOf(input.name)}` && d.named.some((n) => n.local === own),
  );
  const onlyOwn = calls.length === 1 && calls.every((c) => calleeName(c) === own);
  const plain = first.parts.setup.every(
    (s) => isTheme(s) || declaresCallTo(s, own) || isCallStatement(s, own),
  );
  return local && onlyOwn && plain;
}

function precondition(input: HookInput, first: Pass): string | undefined {
  if (!input.tested) return 'untested (Q2, its test commit comes first)';
  const own = `use${input.name}`;
  const file = input.folder.includes(`${hookFileOf(input.name)}.ts`);
  const clash = file || importedNames(importsOf(first.sf)).has(own);
  return clash ? `a same-name hook ${own} exists (adopt step)` : undefined;
}

function shapeFor(input: HookInput, first: Pass): Result<Shape> {
  const renamed = renamedRefs(input, first);
  if (!renamed.ok) return no(renamed.why);
  const second = passOf(input.path, renamed.value, input.name);
  if (!second.ok) return no(second.why);
  const lifted = hoisted(input.path, renamed.value, second.value);
  if (!lifted.ok) return no(lifted.why);
  const third = passOf(input.path, lifted.value.text, input.name);
  return third.ok ? shapeOf(third.value, lifted.value.hoists) : no(third.why);
}

function convert(input: HookInput, first: Pass): HookVerdict {
  const shape = shapeFor(input, first);
  if (!shape.ok) return refuse(shape.why);
  const hook = `${posix.dirname(input.path)}/${hookFileOf(input.name)}.ts`;
  const files = {
    [input.path]: viewText(shape.value, input.name),
    [hook]: hookText(shape.value, input.name),
  };
  return { result: 'hooked', files };
}

/** Step 5 (docs/63 §4): the component's logic moves into `use-name.ts`, or why it cannot. */
export function hookStep(input: HookInput): HookVerdict {
  const first = passOf(input.path, input.text, input.name);
  if (!first.ok) return refuse(first.why);
  const calls = ownHookCalls(first.value.c.fn);
  if (calls.length === 0) return { result: 'no-hook' };
  if (isDone(input, first.value, calls)) return { result: 'done' };
  const at = {
    sf: first.value.sf,
    comps: componentsOf(first.value.sf),
    c: first.value.c,
    parts: first.value.parts,
  };
  const why = refusalOf(at) ?? precondition(input, first.value);
  return why === undefined ? convert(input, first.value) : refuse(why);
}
