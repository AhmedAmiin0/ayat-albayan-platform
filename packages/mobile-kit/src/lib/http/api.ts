import {
  boundReads,
  callWith,
  createApiClient,
  markSending,
  parseResponse,
  readTimeoutFor,
  type SchemaInit,
} from '@ab/client-core';
import type { z } from 'zod';
import { connectivity } from '../connectivity/connectivity';
import { isNetworkError } from '../connectivity/network-error';
import { mobileClientTag } from './client-tag';
import { env } from './env';
import { accessToken } from './access-token';
import { withReadDeadline } from './read-within';
import { reportStall } from './stall-report';

// The one client lives in @ab/client-core (docs/27 E1); this module injects mobile's env, session
// and tag.
export { ApiError, toQueryString, type SendMethod } from '@ab/client-core';

/**
 * fetch that tells the connection state what happened: any response is an answer, a rejection is
 * none.
 */
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

type ReadInit = RequestInit & { schema?: z.ZodType };

/**
 * One request to the API with the session's token (docs/62 part 3 §3b). A read with no answer
 * within readTimeoutFor(path) rejects as no answer and tells the connection state (docs/43 AU9).
 */
export const call = callWith(
  boundReads(client, (send, init, path) => withReadDeadline(send, init, readTimeoutFor(path))),
);

// docs/62 part 3 §3b F deletes the pair below.
/**
 * fetch against the Nest API with the current Supabase access token and the client tag
 * (`X-AB-Client`); with a `schema` the answer is parsed and a mismatch is ApiError bad_response.
 */
export function apiFetch<S extends z.ZodType>(
  path: string,
  init: SchemaInit<S>,
): Promise<z.output<S>>;
export function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
export function apiFetch(path: string, init: ReadInit = {}): Promise<unknown> {
  const { schema, ...rest } = init;
  const read = withReadDeadline((sent) => client.apiFetch(path, sent), rest, readTimeoutFor(path));
  return schema === undefined ? read : read.then((body) => parseResponse(schema, body, path));
}

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export const apiSend = client.apiSend;
