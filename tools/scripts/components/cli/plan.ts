import { posix } from 'node:path';
import type { Step } from './args.schemas.ts';
import type { RepoContext } from './context.ts';
import { excludedWhy, type Target } from './discover.ts';
import { hookStep } from '../steps/hook/hook-step.ts';
import { typesStep } from '../steps/types/types-step.ts';

/** One TSV line of the report: what a step did to a component. */
export interface Row {
  path: string;
  step: Step | 'exclude';
  result: string;
  reason: string;
}

type Overlay = Map<string, string>;

interface StepRun {
  rows: Row[];
  refused: boolean;
}

const RESULT: Record<string, string> = {
  typed: 'typed',
  hooked: 'hooked',
  none: 'unchanged',
  done: 'unchanged',
  'no-hook': 'no-hook',
};

function folderOf(
  t: Target,
  overlay: Overlay,
  ctx: RepoContext & { names: (dir: string) => string[] },
) {
  const dir = posix.dirname(t.path);
  const names = new Set([
    ...ctx.names(dir),
    ...[...overlay.keys()].filter((p) => posix.dirname(p) === dir).map((p) => posix.basename(p)),
  ]);
  const files = Object.fromEntries(
    [...names].map((n) => `${dir}/${n}`).map((p) => [p, overlay.get(p) ?? ctx.read(p)]),
  );
  return { names: [...names], files };
}

const RUNNERS: Record<
  Step,
  (
    t: Target,
    overlay: Overlay,
    ctx: PlanContext,
  ) => { result: string; why?: string; files?: Record<string, string> }
> = {
  types: (t, overlay, ctx) => {
    const { files } = folderOf(t, overlay, ctx);
    const v = typesStep({
      path: t.path,
      text: overlay.get(t.path) ?? ctx.read(t.path),
      name: t.name,
      files,
      outside: ctx.importers(t.path),
    });
    return v.result === 'refused'
      ? { result: 'refused', why: v.why }
      : { result: v.result, ...(v.result === 'typed' ? { files: v.files } : {}) };
  },
  hook: (t, overlay, ctx) => {
    const { names } = folderOf(t, overlay, ctx);
    const v = hookStep({
      path: t.path,
      text: overlay.get(t.path) ?? ctx.read(t.path),
      name: t.name,
      folder: names,
      tested: ctx.tested(t.name, t.ws),
    });
    return v.result === 'refused'
      ? { result: 'refused', why: v.why }
      : { result: v.result, ...(v.result === 'hooked' ? { files: v.files } : {}) };
  },
};

export type PlanContext = RepoContext & {
  names: (dir: string) => string[];
  excludes: ReadonlyMap<string, string>;
};

function runSteps(t: Target, steps: readonly Step[], ctx: PlanContext, overlay: Overlay): StepRun {
  const rows: Row[] = [];
  for (const step of steps) {
    const out = RUNNERS[step](t, overlay, ctx);
    rows.push({
      path: t.path,
      step,
      result: RESULT[out.result] ?? out.result,
      reason: out.why ?? '',
    });
    if (out.result === 'refused') return { rows, refused: true };
    Object.entries(out.files ?? {}).forEach(([p, text]) => overlay.set(p, text));
  }
  return { rows, refused: false };
}

/** Every step's verdict for every target before anything is written; a refused one is left whole. */
export function planAll(
  targets: readonly Target[],
  steps: readonly Step[],
  ctx: PlanContext,
): { rows: Row[]; files: Map<string, string> } {
  const files = new Map<string, string>();
  const rows = targets.flatMap((t) => {
    const why = excludedWhy(t.path, ctx.excludes);
    if (why !== undefined)
      return [
        { path: t.path, step: 'exclude' as const, result: 'refused', reason: `excluded: ${why}` },
      ];
    const overlay: Overlay = new Map();
    const run = runSteps(t, steps, ctx, overlay);
    if (!run.refused) overlay.forEach((text, p) => files.set(p, text));
    return run.rows;
  });
  return { rows, files };
}
