import { salesStartDate, usedBeforeProblem, type SalesStartProblem, type UsedBeforeProblem } from '@ab/shared';
import type { StartValue } from './SalesStartField';

/** The start fields of POST /sales/subscriptions: none without the permission (the API's default day). */
export type StartBody = { startsOn?: string; alreadyStarted?: true; lessonsUsedBefore?: number };

type StartOpts = {
  canSet: boolean;
  today: string;
  /** Lessons of the chosen package (usedBeforeProblem's bound). */
  lessonsTotal: number;
};

/**
 * The same rules as the API (salesStartDate, usedBeforeProblem) before posting: without
 * subscriptions.set_start_date nothing is sent; with it the day, plus `alreadyStarted` only when ticked,
 * and `lessonsUsedBefore` only then and when > 0 (owner 2026-10-28).
 */
export function startBody(value: StartValue, opts: StartOpts): { ok: true; body: StartBody } | { ok: false; code: SalesStartProblem | UsedBeforeProblem } {
  if (!opts.canSet) return { ok: true, body: {} };
  const res = salesStartDate({ startsOn: value.startsOn || undefined, alreadyStarted: value.alreadyStarted, canSet: true, today: opts.today });
  if (!res.ok) return res;
  const used = value.alreadyStarted ? value.usedBefore : 0;
  const problem = usedBeforeProblem({ lessonsUsedBefore: used, startsOn: res.startsOn, today: opts.today, canSet: true, lessonsTotal: opts.lessonsTotal });
  if (problem) return { ok: false, code: problem };
  const started = value.alreadyStarted ? { alreadyStarted: true as const } : {};
  return { ok: true, body: { startsOn: res.startsOn, ...started, ...(used > 0 ? { lessonsUsedBefore: used } : {}) } };
}
