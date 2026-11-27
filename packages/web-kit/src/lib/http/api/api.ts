import {
  type ApiBlob,
  boundReads,
  callWith,
  createApiClient,
  parseResponse,
  readTimeoutFor,
  type SchemaInit,
  type SendMethod,
  withReadDeadline,
} from '@ab/client-core';
import type { z } from 'zod';
import { WEB_CLIENT_TAG } from '@ab/web-kit/lib/http/client-tag';
import { env } from '@ab/web-kit/lib/http/env';
import { supabase } from '@ab/web-kit/lib/http/supabase';

// The one client lives in @ab/client-core (docs/27 E1); this module injects web's env, session and tag.
export { ApiError, type SendMethod } from '@ab/client-core';

type ReadInit = RequestInit & { schema?: z.ZodType };

const client = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  clientTag: () => WEB_CLIENT_TAG,
});

// The signed-link pages (no login): the same client that never sends the session's token.
const publicClient = createApiClient({
  baseUrl: () => env.apiUrl,
  accessToken: () => Promise.resolve(null),
  clientTag: () => WEB_CLIENT_TAG,
});

/**
 * One request to the API with the session's token (docs/62 part 3 §3b). A read with no answer
 * within readTimeoutFor(path) rejects as no answer and frees its request (docs/43 AU9).
 */
export const call = callWith(
  boundReads(client, (send, init, path) =>
    withReadDeadline(send, init, { timeoutMs: readTimeoutFor(path) }),
  ),
);

/** call() for a signed-link page: no Authorization header, whoever is signed in. */
export const publicCall = callWith(publicClient);

// docs/62 part 3 §3b F deletes the pair and its public twins below.
/**
 * fetch against the Nest API with the current Supabase access token and the client tag
 * (`X-AB-Client`). A read with no answer within readTimeoutFor(path) (20 s; a chat file 120 s)
 * rejects as no answer and frees its request (docs/43 AU9, the same deadline as mobile).
 */
export function apiFetch<S extends z.ZodType>(
  path: string,
  init: SchemaInit<S>,
): Promise<z.output<S>>;
export function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
export function apiFetch(path: string, init: ReadInit = {}): Promise<unknown> {
  const { schema, ...rest } = init;
  const timeoutMs = readTimeoutFor(path);
  const read = withReadDeadline((sent) => client.apiFetch(path, sent), rest, { timeoutMs });
  return schema === undefined ? read : read.then((body) => parseResponse(schema, body, path));
}

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;

/** A file from the API with the session's token (CSV exports): its bytes and headers. */
export function apiBlob(path: string, init?: RequestInit): Promise<ApiBlob> {
  return client.apiBlob(path, init);
}

/** GET for a signed-link page: no Authorization header, whoever is signed in on this browser. */
export function publicApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return publicClient.apiFetch(path, init);
}

/** JSON mutation for a signed-link page, without the session (undefined on 204). */
export function publicApiSend<T>(method: SendMethod, path: string, body?: unknown): Promise<T> {
  return publicClient.apiSend(method, path, body);
}
