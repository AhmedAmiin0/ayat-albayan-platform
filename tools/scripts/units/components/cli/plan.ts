import type { Step } from './args.schemas.ts';
import { excludedWhy, type Target } from './discover.ts';
import { RUNNERS, type Overlay, type PlanContext } from './runners.ts';

/** One TSV line of the report: what a step did to a component. */
export interface Row {
  path: string;
  step: Step | 'exclude';
  result: string;
  reason: string;
}

interface Run {
  t: Target;
  steps: readonly Step[];
  ctx: PlanContext;
}

/** Each step in order on the overlay; the first refusal stops the component. */
function runSteps({ t, steps, ctx }: Run, overlay: Overlay): { rows: Row[]; refused: boolean } {
  const rows: Row[] = [];
  for (const step of steps) {
    const out = RUNNERS[step](t, overlay, ctx);
    rows.push({ path: t.path, step, result: out.result, reason: out.why });
    if (out.result === 'refused') return { rows, refused: true };
    Object.entries(out.files).forEach(([p, text]) => overlay.set(p, text));
  }
  return { rows, refused: false };
}

export interface Planned {
  rows: Row[];
  files: Map<string, string>;
}

/** Every step's verdict for every target before anything is written; a refused one stays whole. */
export function planAll(
  targets: readonly Target[],
  steps: readonly Step[],
  ctx: PlanContext,
): Planned {
  const files = new Map<string, string>();
  const rows = targets.flatMap((t): Row[] => {
    const why = excludedWhy(t.path, ctx.excludes);
    if (why !== undefined)
      return [{ path: t.path, step: 'exclude', result: 'refused', reason: `excluded: ${why}` }];
    const overlay: Overlay = new Map();
    const run = runSteps({ t, steps, ctx }, overlay);
    if (!run.refused) overlay.forEach((text, p) => files.set(p, text));
    return run.rows;
  });
  return { rows, files };
}
