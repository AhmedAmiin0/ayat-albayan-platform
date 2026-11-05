import { withDeadline } from './read-deadline';
import { reportStall } from './stall-report';

/**
 * Long enough for a slow but live line: a refresh the server already rotated that we abort would
 * be retried with the old refresh token, and past the server's reuse window that answer signs the
 * user out. A dead connection still settles, and every apiFetch keeps its own 20 s deadline.
 */
export const AUTH_TIMEOUT_MS = 60_000;

/** The reads every apiFetch and the realtime setAuth wait for: the token refresh and GET /user. */
const isSessionRead = (url: URL, init: RequestInit): boolean =>
  url.pathname.endsWith('/auth/v1/token') ?
    url.searchParams.get('grant_type') === 'refresh_token'
  : url.pathname.endsWith('/auth/v1/user') && (init.method ?? 'GET').toUpperCase() === 'GET';

const urlOf = (input: RequestInfo | URL): URL =>
  new URL(input instanceof Request ? input.url : String(input));

/** The whole answer, body included: a body that never arrives must not hang the refresh. */
async function readWhole(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  const body = await res.text();
  const { status, statusText, headers } = res;
  return new Response(body, { status, statusText, headers });
}

/**
 * Supabase's fetch. The session reads settle within AUTH_TIMEOUT_MS: a refresh stuck on a dead
 * connection would hold every getSession() caller forever. Sign-in, sign-out, a password change
 * and Storage uploads keep no deadline (writes; an upload on a slow line may take longer).
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!isSessionRead(urlOf(input), init)) return fetch(input, init);
  const send = (signal: AbortSignal) => readWhole(input, { ...init, signal });
  const opts = { signal: init.signal, onTimeout: reportStall, timeoutMs: AUTH_TIMEOUT_MS };
  return withDeadline(send, opts);
}
