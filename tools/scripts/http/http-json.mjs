// The one outbound HTTP client of tools/scripts (docs/36 H-1, row ht): one JSON call, its 2xx
// body parsed by the caller's zod schema. Errors name «service METHOD /path», the status and the
// error body's code only: never the host, the query, a header value or a body (they may hold a
// key, a password or a family's data). No retries and no timeout, as before (CLI scripts).
import { z } from 'zod';

/** «name METHOD /path»: never the host or the query. */
export function whereOf(name, call) {
  const path = URL.canParse(call.url) ? new URL(call.url).pathname : '<invalid url>';
  return `${name} ${call.method ?? 'GET'} ${path}`;
}

/** A non-2xx answer. */
export class HttpStatusError extends Error {
  constructor(where, { status, code }) {
    super(`${where}: HTTP ${status} (${code})`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.code = code;
  }
}

/** A 2xx whose body the schema rejects (the body itself is never kept). */
export class HttpShapeError extends Error {
  constructor(where, status) {
    super(`${where}: unexpected response (HTTP ${status})`);
    this.name = 'HttpShapeError';
    this.status = status;
  }
}

/** The error body's `error_code`, then `code` (Supabase Auth, GitHub); 'unknown' otherwise. */
const errorCode = z
  .looseObject({ error_code: z.string().optional(), code: z.string().optional() })
  .transform((b) => b.error_code ?? b.code ?? 'unknown')
  .catch('unknown');

function initOf(profile, call) {
  const body = call.json === undefined ? undefined : JSON.stringify(call.json);
  const type = body === undefined ? {} : { 'content-type': 'application/json' };
  return { method: call.method ?? 'GET', headers: { ...profile.headers, ...type }, body };
}

/**
 * profile: { name, headers, fetch? (test seam) } · call: { url, method?, json?, schema }.
 * Returns the schema's output; throws HttpStatusError or HttpShapeError.
 */
export async function httpJson(profile, call) {
  const send = profile.fetch ?? fetch;
  const res = await send(call.url, initOf(profile, call));
  // Not JSON (or empty, a DELETE's 204) → null: the schema decides.
  const body = await res.json().catch(() => null);
  const where = whereOf(profile.name, call);
  const status = res.status;
  if (!res.ok) throw new HttpStatusError(where, { status, code: errorCode.parse(body) });
  const parsed = call.schema.safeParse(body);
  if (!parsed.success) throw new HttpShapeError(where, res.status);
  return parsed.data;
}
