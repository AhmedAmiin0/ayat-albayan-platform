import { createApiClient } from '@ab/client-core';
import { connectivity } from '../connectivity/connectivity';
import { isNetworkError } from '../connectivity/network-error';
import { mobileClientTag } from './client-tag';
import { env } from './env';
import { isRead, markSending, noAnswer, withDeadline } from './read-deadline';
import { reportStall } from './stall-report';
import { supabase } from './supabase';

// The one client lives in @ab/client-core (docs/27 E1); this module injects mobile's env, session and tag.
export { ApiError, toQueryString, type SendMethod } from '@ab/client-core';

/** fetch that tells the connection state what happened: any response is an answer, a rejection is none. */
async function reach(url: string, init: RequestInit): Promise<Response> {
  markSending(init.signal);
  try {
    const res = await fetch(url, init);
    connectivity.reportReached();
    return res;
  } catch (error) {
    if (isNetworkError(error)) connectivity.reportFailure();
    throw error;
  }
}

/**
 * The session's token, or null when signed out. A refresh that failed (no network at resume) leaves
 * an error and no session: that is no answer, not a sign-out (a request without a token would get a
 * 401, and signOutOnAuthError would sign the user out over a network stall).
 */
export async function accessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw noAnswer();
  return data.session?.access_token ?? null;
}

const client = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken,
  clientTag: mobileClientTag,
  fetch: reach,
});

/**
 * The read deadline around a transport: a read (GET) that has not settled within
 * READ_TIMEOUT_MS, token included, rejects as no answer (`TypeError`) and tells the connection
 * state once; writes and uploads keep no deadline. The flow tests' fake backend uses it too.
 */
export function withReadDeadline<T>(
  send: (init: RequestInit) => Promise<T>,
  init: RequestInit = {},
): Promise<T> {
  if (!isRead(init)) return send(init);
  const read = (signal: AbortSignal) => send({ ...init, signal });
  return withDeadline(read, { signal: init.signal, onTimeout: reportStall });
}

/** fetch against the Nest API with the current Supabase access token and the client tag (`X-AB-Client`). */
export const apiFetch = <T>(path: string, init?: RequestInit): Promise<T> =>
  withReadDeadline((sent) => client.apiFetch(path, sent), init);

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;
