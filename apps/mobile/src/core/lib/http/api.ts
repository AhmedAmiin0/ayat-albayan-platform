import { createApiClient } from '@ab/client-core';
import { mobileClientTag } from './client-tag';
import { env } from './env';
import { supabase } from './supabase';

// The one client lives in @ab/client-core (docs/27 E1); this module injects mobile's env, session and tag.
export { ApiError, toQueryString, type SendMethod } from '@ab/client-core';

const client = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  clientTag: mobileClientTag,
});

/** fetch against the Nest API with the current Supabase access token and the client tag (`X-AB-Client`). */
export const apiFetch = client.apiFetch;

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;
