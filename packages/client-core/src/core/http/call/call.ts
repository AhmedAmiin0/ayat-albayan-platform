import { fillRoutePath, type RouteResult } from '@ab/core';
import { z } from 'zod';
import { parseResponse, type ApiClient } from '../api-client';
import { toQueryString } from '../query-string';
import type { AnyCallInput, CallableRoute, CallInput } from './call.types';

const NO_BODY = z.undefined();
const queryValue = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((value) => (value === null ? undefined : value))
  .transform((value) => (typeof value === 'boolean' ? String(value) : value));
const querySchema = z.record(z.string(), queryValue).default({});

const answerOf = (route: CallableRoute): z.ZodType =>
  route.response instanceof z.ZodType ? route.response : NO_BODY;

function urlOf(route: CallableRoute, input: AnyCallInput): string {
  const query = toQueryString(querySchema.parse(input.query));
  return `${fillRoutePath(route.path, input.params)}${query}`;
}

/**
 * One call of a route object (docs/62 part 3 §3): the path from routePath, the query string, the
 * body, and the answer parsed strictly with the route's own schema. The client sees the same
 * apiFetch(path) / apiSend(method, path, body) a hand-written call made.
 */
export function call<R extends CallableRoute>(
  api: ApiClient,
  route: R,
  input: CallInput<R>,
): Promise<RouteResult<R>>;
export function call(api: ApiClient, route: CallableRoute, input: AnyCallInput): Promise<unknown> {
  const url = urlOf(route, input);
  const answer =
    route.method === 'GET' ? api.apiFetch(url) : api.apiSend(route.method, url, input.body);
  return answer.then((body: unknown) => parseResponse(answerOf(route), body, url));
}
