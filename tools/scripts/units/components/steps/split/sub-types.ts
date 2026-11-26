import { posix } from 'node:path';
import type { SplitCtx } from './split.types.ts';
import { readsAny } from '../../model/names.ts';
import { no, ok } from '../../model/result.ts';
import { restOf, typeNamesFrom } from './locals.ts';
import { moveTypes } from './types-move.ts';
import type { Component } from '../../model/model.types.ts';
import type { Result } from '../../model/model.types.ts';
import type { SubTypes } from './split.types.ts';

const mentions = (text: string, name: string): boolean => new RegExp(`\\b${name}\\b`).test(text);

const typesPathOf = (ctx: SplitCtx): string => `${ctx.dir}/${ctx.input.name}.types.ts`;

/** The types only `sub` reads, or the one it shares with the rest of the folder. */
function ownTypes(ctx: SplitCtx, sub: Component): Result<string[]> {
  const types = typeNamesFrom(ctx.sf, ctx.typesSpec);
  const mine = [...readsAny([sub.statement])].filter((n) => types.has(n));
  const restReads = readsAny(restOf(ctx.sf, sub));
  const others = Object.entries(ctx.input.files).filter(([p]) => p !== typesPathOf(ctx));
  const shared = mine.find((t) => restReads.has(t) || others.some(([, text]) => mentions(text, t)));
  return shared === undefined
    ? ok(mine)
    : no(`${sub.name} shares the type ${shared} with ${ctx.input.name}`);
}

/** `sub`'s own types moved from the running `Name.types.ts` to `Sub/Sub.types.ts`. */
export function subTypes(
  ctx: SplitCtx,
  sub: Component,
  files: Readonly<Record<string, string>>,
): Result<SubTypes> {
  const names = ownTypes(ctx, sub);
  if (!names.ok) return no(names.why);
  if (names.value.length === 0) return ok({ names: [], files: {} });
  const path = typesPathOf(ctx);
  const subDir = `${ctx.dir}/${sub.name}`;
  const text = files[path] ?? ctx.input.files[path] ?? '';
  const moved = moveTypes({ path, text, subDir, owner: ctx.input.name }, new Set(names.value));
  if (!moved.ok) return no(`${sub.name} ${moved.why}`);
  const subPath = posix.join(subDir, `${sub.name}.types.ts`);
  return ok({
    names: names.value,
    files: { [path]: moved.value.parent, [subPath]: moved.value.sub },
  });
}
