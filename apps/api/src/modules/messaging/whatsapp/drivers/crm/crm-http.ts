import { z } from 'zod';
import type { CrmLineEnv } from '@/config/env/env';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { FetchLike, HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';
import { reachInfo, TIMEOUT_INFO } from '@/modules/messaging/whatsapp/drivers/transport-info';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { recordingFetch } from '@/modules/messaging/whatsapp/drivers/crm/crm-fetch';
import { crmErrorOf } from './crm-errors';

export { crmErrorFrom } from './crm-errors';

// One call to the academy CRM's public REST API (docs/19 «crm driver»): Bearer key, JSON, timeout,
// and the CRM's envelope ({data} / {error:{code,message}}) → WaError. The CRM has no idempotency
// key, so an answer that may have come after the CRM reached Meta is `uncertain` (never resent
// automatically).

export interface CrmConn {
  env: CrmLineEnv;
  fetch: FetchLike;
  timeoutMs: number;
}

type CrmAnswer = Parameters<typeof crmErrorOf>[0];

interface CrmRequest {
  /** Relative to the base («messages», «me»). */
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** Only a status failure reaches the default: every other kind has its own entry. */
const NO_STATUS: CrmAnswer = { status: 0, body: null, retryAfter: null };
const answerOf = (f: HttpFailure): CrmAnswer => (f.kind === 'status' ? f : NO_STATUS);

/** Uncertain unless never connected; each keeps the text it had before (AbortSignal.timeout's). */
const crmErrors = (seen: { cause: string }): ErrorTable<WaError> => ({
  network: (f) =>
    new WaError(`CRM request failed: ${seen.cause}`, reachInfo(f.kind === 'network' && f.reached)),
  timeout: () =>
    new WaError('CRM request failed: The operation was aborted due to timeout', TIMEOUT_INFO),
  default: (f) => crmErrorOf(answerOf(f)),
});

/** The envelope's `data`; any other 2xx body is null. */
const dataSchema = z.union([
  z.looseObject({ data: z.unknown() }).transform((b) => b.data ?? null),
  z.unknown().transform(() => null),
]);

// The CRM never redirects: a 3xx (a wrong base) fails as «not sent», never a POST turned GET.
const crmHttp = (conn: CrmConn) => {
  const transport = recordingFetch(conn.fetch);
  return createHttp({
    name: 'crm',
    base: () => conn.env.base,
    headers: () =>
      Promise.resolve({ authorization: `Bearer ${conn.env.apiKey}`, accept: 'application/json' }),
    timeoutMs: conn.timeoutMs,
    redirect: 'manual',
    errorBody: z.unknown(),
    errors: crmErrors(transport.seen),
    fetch: transport.fetch,
  });
};

/** The `data` of a 2xx answer; throws WaError otherwise. */
export async function crmJson(conn: CrmConn, req: CrmRequest): Promise<unknown> {
  const call = { path: req.path, method: req.method ?? 'GET', json: req.body, schema: dataSchema };
  return crmHttp(conn).json(call);
}
