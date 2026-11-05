import { createHttp } from '@/common/infra/http/http';
import type { FetchLike } from '@/common/infra/http/failure';
import type { Http } from '@/common/infra/http/http.types';
import type { EvolutionLineEnv } from '@/config/env/env';
import { evolutionErrorSchema, evolutionTable } from './evolution-errors';

// The Evolution API profile (docs/19 «Evolution driver», docs/36 H-1): `apikey` header (the
// instance's own token), JSON, one deadline per call, and redirects refused (a 3xx is a plain
// failure: no hop to another host, no POST turned GET). Evolution has no idempotency key, so a
// send whose answer is lost is `uncertain` (never resent automatically).

export interface EvolutionConn {
  env: EvolutionLineEnv;
  /** Test seam; the runtime client's fetch otherwise. */
  fetch?: FetchLike;
  timeoutMs: number;
}

/** {route}/{instance}: Evolution's routerPath appends the instance name to every route. */
export const evolutionPath = (env: EvolutionLineEnv, route: string): string =>
  `${route}/${encodeURIComponent(env.instance)}`;

/** `sent`: a message send (an unexpected 2xx body is `uncertain`). */
export function evolutionHttp(conn: EvolutionConn, sent = false): Http {
  return createHttp({
    name: 'evolution',
    base: () => conn.env.base,
    headers: () => Promise.resolve({ apikey: conn.env.token }),
    timeoutMs: conn.timeoutMs,
    redirect: 'error',
    errorBody: evolutionErrorSchema,
    errors: evolutionTable(sent),
    ...(conn.fetch ? { fetch: conn.fetch } : {}),
  });
}
