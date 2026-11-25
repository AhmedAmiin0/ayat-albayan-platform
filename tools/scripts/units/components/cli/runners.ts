import { posix } from 'node:path';
import type { Step } from './args.schemas.ts';
import type { RepoContext } from './context.ts';
import type { Target } from './discover.ts';
import type { HookVerdict } from '../steps/hook/hook.types.ts';
import { hookStep } from '../steps/hook/hook-step.ts';
import type { TypesVerdict } from '../steps/types/types.types.ts';
import { typesStep } from '../steps/types/types-step.ts';

export type PlanContext = RepoContext & {
  names: (dir: string) => string[];
  excludes: ReadonlyMap<string, string>;
};

/** What one step did: `typed`, `hooked`, `unchanged`, `no-hook` or `refused` (with why). */
export interface Outcome {
  result: string;
  why: string;
  files: Record<string, string>;
}

export type Overlay = Map<string, string>;

const outcome = (result: string, why = '', files: Record<string, string> = {}): Outcome => ({
  result,
  why,
  files,
});

function fromTypes(v: TypesVerdict): Outcome {
  if (v.result === 'typed') return outcome('typed', '', v.files);
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
  hook: (t, overlay, ctx) => {
    const { names, text } = folderOf(t, overlay, ctx);
    const tested = ctx.tested(t.name, t.ws);
    return fromHook(hookStep({ path: t.path, text, name: t.name, folder: names, tested }));
  },
};
