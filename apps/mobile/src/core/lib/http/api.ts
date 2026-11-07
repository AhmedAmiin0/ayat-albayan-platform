import { createApiClient, markSending, readTimeoutFor } from '@ab/client-core';
import { connectivity } from '@/core/lib/connectivity/connectivity';
import { isNetworkError } from '@/core/lib/connectivity/network-error';
import { mobileClientTag } from './client-tag';
import { env } from './env';
import { accessToken } from './access-token';
import { withReadDeadline } from './read-within';
import { reportStall } from './stall-report';

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

const client = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken,
  clientTag: mobileClientTag,
  fetch: reach,
  // A write with no answer in 30 s (client-core's send deadline) is a stall too.
  onStall: reportStall,
});

/** fetch against the Nest API with the current Supabase access token and the client tag (`X-AB-Client`). */
export const apiFetch = <T>(path: string, init?: RequestInit): Promise<T> =>
  withReadDeadline((sent) => client.apiFetch(path, sent), init, readTimeoutFor(path));

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;
