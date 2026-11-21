import type { CheckState, ReadinessChecks, ReadyState } from '@ab/shared';

/** How bad each check state is: `off` (not configured here) is as good as ok. */
const RANK: Record<CheckState, number> = { off: 0, ok: 0, degraded: 1, down: 2 };
const BY_RANK: readonly ReadyState[] = ['ok', 'degraded', 'down'];

const HTTP: Record<ReadyState, number> = { ok: 200, degraded: 200, down: 503 };

/** The worst check wins. Only the database can say `down`; Redis and jobs stop at `degraded`. */
export function rollup(checks: ReadinessChecks): ReadyState {
  const worst = Math.max(...Object.values(checks).map((c) => RANK[c.status]));
  return BY_RANK[worst] ?? 'down';
}

/** 503 only when the API cannot serve (the database); degraded still serves. */
export const httpStatusOf = (state: ReadyState): number => HTTP[state];
