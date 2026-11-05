import { withDeadline } from './read-deadline';
import { reportStall } from './stall-report';

const AUTH_PATH = '/auth/v1/';

const urlOf = (input: RequestInfo | URL): string =>
  input instanceof Request ? input.url : String(input);

/**
 * Supabase's fetch. Its auth calls (the token refresh that every apiFetch and the realtime setAuth
 * wait for) settle within READ_TIMEOUT_MS: a refresh stuck on a dead connection would hold them
 * all forever. Storage uploads keep no deadline (a receipt on a slow line may take longer).
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!urlOf(input).includes(AUTH_PATH)) return fetch(input, init);
  const send = (signal: AbortSignal) => fetch(input, { ...init, signal });
  return withDeadline(send, { signal: init.signal, onTimeout: reportStall });
}
