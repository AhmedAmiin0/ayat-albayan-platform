import {
  checkStateSchema,
  readyStateSchema,
  type ReadinessChecks,
  type ReadyState,
} from '@ab/shared';
import { z } from 'zod';

/** Each check state as an answer: `off` (not configured here) is as good as ok. */
const AS_READY = z
  .record(checkStateSchema, readyStateSchema)
  .readonly()
  .decode({ off: 'ok', ok: 'ok', degraded: 'degraded', down: 'down' });
const RANK = z
  .record(readyStateSchema, z.number())
  .readonly()
  .decode({ ok: 0, degraded: 1, down: 2 });
const worse = (a: ReadyState, b: ReadyState): ReadyState => (RANK[b] > RANK[a] ? b : a);

const HTTP = z
  .record(readyStateSchema, z.number())
  .readonly()
  .decode({ ok: 200, degraded: 200, down: 503 });

/** The worst check wins. Only the database can say `down`; Redis and jobs stop at `degraded`. */
export function rollup(checks: ReadinessChecks): ReadyState {
  return Object.values(checks)
    .map((c) => AS_READY[c.status])
    .reduce<ReadyState>(worse, 'ok');
}

/** 503 only when the API cannot serve (the database); degraded still serves. */
export const httpStatusOf = (state: ReadyState): number => HTTP[state];
