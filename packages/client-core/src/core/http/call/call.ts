import { fillRoutePath, type RouteMethod, type RouteResult } from '@ab/core';
import { z } from 'zod';
import { parseResponse, type ApiClient, type SendMethod } from '../api-client';
import { toQueryString } from '../query-string';
import type { AnyCallRequest, Call, CallableRoute, CallRequest } from './call.types';

const NO_BODY = z.undefined();

/** The schema an answer is parsed with: the route's own, or nothing for an empty answer. */
const answerSchema = z.union([
  z.instanceof(z.ZodType),
  z.literal('empty').transform(() => NO_BODY),
]);

const queryValue = z.union([
  z.string(),
  z.number(),
  z.boolean().transform(String),
  z.null().transform(() => undefined),
  z.undefined(),
]);
const querySchema = z.record(z.string(), queryValue).default({});

const read = (api: ApiClient, url: string): Promise<unknown> => api.apiFetch(url);
const send =
  (method: SendMethod) =>
  (api: ApiClient, url: string, body: unknown): Promise<unknown> =>
    api.apiSend(method, url, body);

/** Reads go through apiFetch; writes through apiSend, which adds the send deadline. */
const ASK = {
  GET: read,
  POST: send('POST'),
  PUT: send('PUT'),
  PATCH: send('PATCH'),
  DELETE: send('DELETE'),
} satisfies Record<RouteMethod, unknown>;

function urlOf({ route, params, query }: AnyCallRequest): string {
  const search = toQueryString(querySchema.parse(query));
  return `${fillRoutePath(route.path, params)}${search}`;
}

function ask<R extends CallableRoute>(
  api: ApiClient,
  request: CallRequest<R>,
): Promise<RouteResult<R>>;
function ask(api: ApiClient, request: AnyCallRequest): Promise<unknown> {
  const url = urlOf(request);
  return ASK[request.route.method](api, url, request.body).then((body: unknown) =>
    parseResponse(answerSchema.parse(request.route.response), body, url),
  );
}

/**
 * The call() of one api client (docs/62 part 3 §3), bound once where the client is in scope: each
 * call takes one request, the route object and its inputs. The path comes from the route, the
 * answer is parsed strictly with the route's own schema, and the client sees the same
 * apiFetch(path) / apiSend(method, path, body) a hand-written call made.
 */
export function callWith(api: ApiClient): Call {
  return (request) => ask(api, request);
}
