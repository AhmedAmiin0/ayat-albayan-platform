import { posix } from 'node:path';
import type { SplitCtx, SplitInput, SplitVerdict } from './split.types.ts';
import { componentsOf } from '../../model/components.ts';
import { no, ok } from '../../model/result.ts';
import { isExported, parseFile } from '../../model/source.ts';
import { closesOver, parentLocals } from './locals.ts';
import { indexText, parentText, subPathOf, subText } from './sub-file.ts';
import { subTypes } from './sub-types.ts';
import type { Component } from '../../model/model.types.ts';
import type { Result } from '../../model/model.types.ts';

const CAP = 12;

const refuse = (why: string): SplitVerdict => ({ result: 'refused', why });

/** Why the file cannot split at all, checked before any sub-component is looked at. */
function fileRefusal(input: SplitInput, comps: readonly Component[]): string | undefined {
  const extras = comps.filter((c) => c.name !== input.name);
  if (comps.filter((c) => isExported(c.statement)).length > 1)
    return 'the file exports 2+ components';
  const out = extras.find((c) => isExported(c.statement));
  if (out !== undefined) return `${out.name} is exported`;
  if (input.subfolders.length + extras.length > CAP)
    return `${input.name}/ would pass ${CAP} sub-folders`;
  const taken = extras.find((c) => input.subfolders.includes(c.name));
  return taken === undefined ? undefined : `${taken.name}/ already exists`;
}

/** The sub-component's hook, when it has logic; a refused hook refuses the split. */
function withHook(
  ctx: SplitCtx,
  sub: Component,
  files: Record<string, string>,
): Result<Record<string, string>> {
  const path = subPathOf(ctx.input.path, sub.name);
  const hooked = ctx.input.hook(path, files[path] ?? '', sub.name);
  if (hooked.result === 'refused') return no(`${sub.name}: ${hooked.why}`);
  return ok(hooked.result === 'hooked' ? { ...files, ...hooked.files } : files);
}

/** One sub-component's files, folding its types out of the running `Name.types.ts`. */
function subFiles(
  ctx: SplitCtx,
  sub: Component,
  files: Record<string, string>,
): Result<Record<string, string>> {
  const hit = closesOver(sub, ctx.locals);
  if (hit !== undefined) return no(`${sub.name} reads ${hit}, local to ${ctx.input.name}.tsx`);
  const types = subTypes(ctx, sub, files);
  if (!types.ok) return no(types.why);
  const path = subPathOf(ctx.input.path, sub.name);
  const text = subText(
    { sf: ctx.sf, sub, dir: ctx.dir, typesSpec: ctx.typesSpec },
    types.value.names,
  );
  const own = { [path]: text, [`${posix.dirname(path)}/index.ts`]: indexText(sub.name) };
  return withHook(ctx, sub, { ...files, ...types.value.files, ...own });
}

/** Step 4 (docs/63 §4): each extra component of `Name.tsx` moves to `Name/Sub/Sub.tsx`. */
export function splitStep(input: SplitInput): SplitVerdict {
  const sf = parseFile(input.path, input.text);
  const comps = componentsOf(sf);
  if (!comps.some((c) => c.name === input.name)) return refuse(`no component ${input.name}`);
  const extras = comps.filter((c) => c.name !== input.name);
  if (extras.length === 0) return { result: 'none' };
  const why = fileRefusal(input, comps);
  if (why !== undefined) return refuse(why);
  const typesSpec = `./${input.name}.types`;
  const locals = new Set([...parentLocals(sf, typesSpec), ...comps.map((c) => c.name)]);
  const ctx: SplitCtx = { input, sf, dir: posix.dirname(input.path), typesSpec, locals };
  const out = extras.reduce<Result<Record<string, string>>>(
    (acc, sub) => (acc.ok ? subFiles(ctx, sub, acc.value) : acc),
    ok({}),
  );
  if (!out.ok) return refuse(out.why);
  const parent = parentText(
    input.path,
    input.text,
    extras.map((c) => c.name),
  );
  return { result: 'split', files: { ...out.value, [input.path]: parent } };
}
