import { createApiClient } from '@ab/client-core';
import { connectivity } from '../connectivity/connectivity';
import { isNetworkError } from '../connectivity/network-error';
import { mobileClientTag } from './client-tag';
import { env } from './env';
import { supabase } from './supabase';

// The one client lives in @ab/client-core (docs/27 E1); this module injects mobile's env, session and tag.
export { ApiError, toQueryString, type SendMethod } from '@ab/client-core';

/** fetch that tells the connection state what happened: any response is an answer, a rejection is none. */
async function reach(url: string, init: RequestInit): Promise<Response> {
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
  accessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  clientTag: mobileClientTag,
  fetch: reach,
});

/** fetch against the Nest API with the current Supabase access token and the client tag (`X-AB-Client`). */
export const apiFetch = client.apiFetch;

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;
