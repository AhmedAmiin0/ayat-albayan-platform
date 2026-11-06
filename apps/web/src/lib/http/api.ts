import {
  createApiClient,
  readTimeoutFor,
  type SendMethod,
  withReadDeadline,
} from '@ab/client-core';
import { WEB_CLIENT_TAG } from './client-tag';
import { env } from './env';
import { supabase } from './supabase';

// The one client lives in @ab/client-core (docs/27 E1); this module injects web's env, session and tag.
export { ApiError, type SendMethod } from '@ab/client-core';

const client = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  clientTag: () => WEB_CLIENT_TAG,
});

/**
 * fetch against the Nest API with the current Supabase access token and the client tag
 * (`X-AB-Client`). A read with no answer within readTimeoutFor(path) (20 s; a chat file 120 s)
 * rejects as no answer and frees its request (docs/43 AU9, the same deadline as mobile).
 */
export const apiFetch = <T>(path: string, init?: RequestInit): Promise<T> => {
  const timeoutMs = readTimeoutFor(path);
  return withReadDeadline((sent) => client.apiFetch(path, sent), init, { timeoutMs });
};

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;

// The signed-link pages (no login): the same client that never sends the session's token.
const publicClient = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken: () => Promise.resolve(null),
  clientTag: () => WEB_CLIENT_TAG,
});

/** GET for a signed-link page: no Authorization header, whoever is signed in on this browser. */
export function publicApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return publicClient.apiFetch(path, init);
}

/** JSON mutation for a signed-link page, without the session (undefined on 204). */
export function publicApiSend<T>(method: SendMethod, path: string, body?: unknown): Promise<T> {
  return publicClient.apiSend(method, path, body);
}
