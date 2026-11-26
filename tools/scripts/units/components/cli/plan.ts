import ts from 'typescript';
import type { Step } from './args.schemas.ts';
import { excludedWhy } from './discover.ts';
import { RUNNERS } from './runners.ts';
import type { Target } from './cli.types.ts';
import type { Overlay } from './cli.types.ts';
import type { PlanContext } from './cli.types.ts';
import type { Row } from './cli.types.ts';
import type { Planned } from './cli.types.ts';

const SYNTAX = { jsx: ts.JsxEmit.Preserve, noResolve: true, isolatedModules: true };

/** A safety net: a step whose output has a syntax error refuses the component. */
const parses = (path: string, text: string): boolean =>
  (
    ts.transpileModule(text, { fileName: path, reportDiagnostics: true, compilerOptions: SYNTAX })
      .diagnostics ?? []
  ).length === 0;

interface Result {
  rows: Row[];
  refused: boolean;
}

interface Run {
  t: Target;
  steps: readonly Step[];
  ctx: PlanContext;
}

/** Each step in order on the overlay; the first refusal stops the component. */
function runSteps({ t, steps, ctx }: Run, overlay: Overlay, gone: Set<string>): Result {
  const rows: Row[] = [];
  for (const step of steps) {
    const out = RUNNERS[step](t, overlay, ctx);
    rows.push({ path: t.path, step, result: out.result, reason: out.why });
    const broken = Object.entries(out.files).find(([p, text]) => !parses(p, text))?.[0];
    if (broken !== undefined)
      rows.push({
        path: t.path,
        step,
        result: 'refused',
        reason: `generated ${broken} does not parse`,
      });
    if (out.result === 'refused' || broken !== undefined) return { rows, refused: true };
    Object.entries(out.files).forEach(([p, text]) => overlay.set(p, text));
    out.deleted.forEach((p) => gone.add(p));
  }
  return { rows, refused: false };
}

/** Every step's verdict for every target before anything is written; a refused one stays whole. */
export function planAll(
  targets: readonly Target[],
  steps: readonly Step[],
  ctx: PlanContext,
): Planned {
  const files = new Map<string, string>();
  const deleted = new Set<string>();
  const rows = targets.flatMap((t): Row[] => {
    const why = excludedWhy(t.path, ctx.excludes);
    if (why !== undefined)
      return [{ path: t.path, step: 'exclude', result: 'refused', reason: `excluded: ${why}` }];
    const overlay: Overlay = new Map();
    const gone = new Set<string>();
    const run = runSteps({ t, steps, ctx }, overlay, gone);
    if (run.refused) return run.rows;
    overlay.forEach((text, p) => files.set(p, text));
    gone.forEach((p) => deleted.add(p));
    return run.rows;
  });
  return { rows, files, deleted };
}
