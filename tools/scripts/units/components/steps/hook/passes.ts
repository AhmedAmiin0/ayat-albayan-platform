import type ts from 'typescript';
import type { HookInput } from './hook.types.ts';
import { componentsOf } from '../../model/components.ts';
import { applyEdits } from '../../model/edits.ts';
import { importedNames, importsOf } from '../../model/imports.ts';
import { declaredNames } from '../../model/names.ts';
import { partsOf } from '../../model/parts.ts';
import { no, ok } from '../../model/result.ts';
import { parseFile } from '../../model/source.ts';
import { hoistsOf } from './hoist.ts';
import { readsCurrent, refRenames, renameEdits } from './refs.ts';
import { ownHookCalls } from './refusals.ts';
import type { Parts } from '../../model/model.types.ts';
import type { Result } from '../../model/model.types.ts';
import type { Pass } from './hook.types.ts';
import type { Hoisted } from './hook.types.ts';

export function passOf(path: string, text: string, name: string): Result<Pass> {
  const sf = parseFile(path, text);
  const c = componentsOf(sf).find((x) => x.name === name);
  const body = c?.fn.body;
  if (c === undefined || body === undefined) return no(`no component ${name} with a body`);
  return ok({ sf, c, parts: partsOf(body) });
}

export const viewOf = (p: Parts): ts.Node[] => [
  ...p.guards,
  ...(p.ret === undefined ? [] : [p.ret]),
];

/** Pass 1: refs renamed to `xRef`; refused when the view reads `.current`. */
export function renamedRefs(input: HookInput, first: Pass): Result<string> {
  const renames = refRenames(first.parts.setup);
  const refs = new Set([...renames.keys(), ...renames.values()]);
  if (readsCurrent(viewOf(first.parts), refs)) return no('the JSX reads a ref (.current)');
  return ok(applyEdits(input.text, renameEdits(first.c.fn, { renames, sf: first.sf })));
}

/** Pass 2: hook calls in the JSX replaced by consts the hook returns. */
export function hoisted(path: string, text: string, second: Pass): Result<Hoisted> {
  const { setup, guards, ret } = second.parts;
  const taken = new Set([...setup.flatMap(declaredNames), ...importedNames(importsOf(second.sf))]);
  const calls = viewOf(second.parts).flatMap(ownHookCalls);
  const found = hoistsOf(calls, { ret: ret ?? second.c.fn, guarded: guards.length > 0, taken });
  if (!found.ok) return no(found.why);
  const lines = found.value.map((h) => `const ${h.name} = ${h.call.getText(second.sf)};`);
  const parsed = parseFile(path, lines.join('\n'));
  const edits = found.value.map((h) => ({
    start: h.call.getStart(second.sf),
    end: h.call.getEnd(),
    value: h.name,
  }));
  const hoists = found.value.map((h, i) => ({
    name: h.name,
    text: lines[i] ?? '',
    call: parsed.statements[i] ?? parsed,
  }));
  return ok({ text: applyEdits(text, edits), hoists });
}
