import { posix } from 'node:path';
import type { Step } from './args.schemas.ts';
import type { RepoContext } from './context.ts';
import type { Target } from './discover.ts';
import type { HelpersVerdict } from '../steps/helpers/helpers.types.ts';
import { helpersStep } from '../steps/helpers/helpers-step.ts';
import type { HookVerdict } from '../steps/hook/hook.types.ts';
import { hookStep } from '../steps/hook/hook-step.ts';
import type { TypesVerdict } from '../steps/types/types.types.ts';
import { typesStep } from '../steps/types/types-step.ts';
import type { SplitVerdict } from '../steps/split/split.types.ts';
import { splitStep } from '../steps/split/split-step.ts';
import type { AdoptVerdict } from '../steps/adopt/adopt.types.ts';
import { adoptStep } from '../steps/adopt/adopt-step.ts';

export type PlanContext = RepoContext & {
  names: (dir: string) => string[];
  subfolders: (dir: string) => string[];
  excludes: ReadonlyMap<string, string>;
};

/** What one step did: `typed`, `hooked`, `unchanged`, `no-hook` or `refused` (with why). */
export interface Outcome {
  result: string;
  why: string;
  files: Record<string, string>;
  deleted: string[];
}

export type Overlay = Map<string, string>;

const outcome = (result: string, why = '', files: Record<string, string> = {}): Outcome => ({
  result,
  why,
  files,
  deleted: [],
});

function fromAdopt(v: AdoptVerdict): Outcome {
  if (v.result === 'adopted') return { ...outcome('adopted', '', v.files), deleted: v.deleted };
  return v.result === 'refused' ? outcome('refused', v.why) : outcome('unchanged');
}

function fromTypes(v: TypesVerdict): Outcome {
  if (v.result === 'typed') return outcome('typed', '', v.files);
  return v.result === 'refused' ? outcome('refused', v.why) : outcome('unchanged');
}

function fromHelpers(v: HelpersVerdict): Outcome {
  if (v.result === 'helpers') return outcome('helpers', '', v.files);
  return v.result === 'refused' ? outcome('refused', v.why) : outcome('unchanged');
}

function fromSplit(v: SplitVerdict): Outcome {
  if (v.result === 'split') return outcome('split', '', v.files);
  return v.result === 'refused' ? outcome('refused', v.why) : outcome('unchanged');
}

const HOOK_RESULT: Record<'no-hook' | 'done', string> = { 'no-hook': 'no-hook', done: 'unchanged' };

function fromHook(v: HookVerdict): Outcome {
  if (v.result === 'hooked') return outcome('hooked', '', v.files);
  return v.result === 'refused' ? outcome('refused', v.why) : outcome(HOOK_RESULT[v.result]);
}

/** The folder's file names and texts as the earlier steps left them. */
function folderOf(t: Target, overlay: Overlay, ctx: PlanContext) {
  const dir = posix.dirname(t.path);
  const added = [...overlay.keys()]
    .filter((p) => posix.dirname(p) === dir)
    .map((p) => posix.basename(p));
  const names = [...new Set([...ctx.names(dir), ...added])];
  const files = Object.fromEntries(
    names.map((n) => `${dir}/${n}`).map((p) => [p, overlay.get(p) ?? ctx.read(p)]),
  );
  return { names, files, text: overlay.get(t.path) ?? ctx.read(t.path) };
}

type Runner = (t: Target, overlay: Overlay, ctx: PlanContext) => Outcome;

export const RUNNERS: Record<Step, Runner> = {
  types: (t, overlay, ctx) => {
    const { files, text } = folderOf(t, overlay, ctx);
    return fromTypes(
      typesStep({ path: t.path, text, name: t.name, files, outside: ctx.importers(t.path) }),
    );
  },
  helpers: (t, overlay, ctx) => {
    const { files, text } = folderOf(t, overlay, ctx);
    const outside = ctx.importers(t.path);
    return fromHelpers(helpersStep({ path: t.path, text, name: t.name, files, outside }));
  },
  split: (t, overlay, ctx) => {
    const { files, text } = folderOf(t, overlay, ctx);
    const dir = posix.dirname(t.path);
    const hook = (path: string, sub: string, name: string) =>
      hookStep({ path, text: sub, name, folder: [`${name}.tsx`], tested: ctx.tested(name, t.ws) });
    return fromSplit(
      splitStep({ path: t.path, text, name: t.name, files, subfolders: ctx.subfolders(dir), hook }),
    );
  },
  adopt: (t, overlay, ctx) => {
    const { names, text } = folderOf(t, overlay, ctx);
    const read = (p: string): string => overlay.get(p) ?? ctx.read(p);
    return fromAdopt(adoptStep({ ...ctx, read, path: t.path, text, name: t.name, folder: names }));
  },
  hook: (t, overlay, ctx) => {
    const { names, text } = folderOf(t, overlay, ctx);
    const tested = ctx.tested(t.name, t.ws);
    return fromHook(hookStep({ path: t.path, text, name: t.name, folder: names, tested }));
  },
};
