import type { EvolutionLineEnv } from '@/config/env/env';
import { mayHaveReached, type FetchLike } from '@/common/infra/http/failure';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { evolutionError } from './evolution-errors';

// One call to a self-hosted Evolution API (docs/19 «Evolution driver»): `apikey` header (the
// instance's own token), JSON, a deadline, no redirect. Evolution has no idempotency key, so an
// answer lost after the request left is `uncertain` (never resent automatically).

export interface EvolutionConn {
  env: EvolutionLineEnv;
  fetch: FetchLike;
  timeoutMs: number;
}

export interface EvolutionRequest {
  /** Evolution's route without the instance: «message/sendText», «instance/connectionState». */
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}

function json(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** {base}/{route}/{instance}: Evolution's routerPath appends the instance name to every route. */
export const evolutionUrl = (env: EvolutionLineEnv, path: string): string =>
  `${env.base}/${path}/${encodeURIComponent(env.instance)}`;

function init(conn: EvolutionConn, req: EvolutionRequest): RequestInit {
  const hasBody = req.body !== undefined;
  const type: Record<string, string> = hasBody ? { 'content-type': 'application/json' } : {};
  return {
    method: req.method ?? 'GET',
    headers: { apikey: conn.env.token, accept: 'application/json', ...type },
    body: hasBody ? JSON.stringify(req.body) : undefined,
    signal: AbortSignal.timeout(conn.timeoutMs),
    // Evolution never redirects: a 3xx (a wrong base, a proxy) is a plain failure, never followed
    // (no POST turned GET, no hop to a private host).
    redirect: 'manual',
  };
}

/** The parsed body of a 2xx answer; throws WaError otherwise. */
export async function evolutionJson(conn: EvolutionConn, req: EvolutionRequest): Promise<unknown> {
  const res = await conn.fetch(evolutionUrl(conn.env, req.path), init(conn, req)).catch(
    (e: unknown) => {
      const message = `Evolution request failed: ${e instanceof Error ? e.message : String(e)}`;
      throw new WaError(message, { code: null, status: 0, uncertain: mayHaveReached(e) });
    },
  );
  const text = await res.text().catch(() => '');
  if (!res.ok) throw evolutionError({ status: res.status, text });
  return json(text);
}
