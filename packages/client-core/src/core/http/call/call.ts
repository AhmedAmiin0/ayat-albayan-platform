import { fillRoutePath, type RouteResult } from '@ab/core';
import { z } from 'zod';
import {
  parseResponse,
  type ApiClient,
  type ApiRequest,
  type Requester,
  type SchemaRequest,
} from '../api-client';
import { toQueryString } from '../query-string';
import { askVia } from './ask';
import type { AnyCallRequest, Ask, Call, CallableRoute, CallRequest } from './call.types';

const NO_BODY = z.undefined();
const ANY_BODY = z.unknown();

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

const routeShape = z.object({ route: z.object({ method: z.string(), path: z.string() }) });

const isRouteRequest = (request: AnyCallRequest | ApiRequest): request is AnyCallRequest =>
  routeShape.safeParse(request).success;

function urlOf({ route, params, query }: AnyCallRequest): string {
  const search = toQueryString(querySchema.parse(query));
  return `${fillRoutePath(route.path, params)}${search}`;
}

async function askRoute(ask: Ask, request: AnyCallRequest): Promise<unknown> {
  const { route, body, signal } = request;
  const path = urlOf(request);
  const answer = await ask({ method: route.method, path, body, ...(signal ? { signal } : {}) });
  return parseResponse(answerSchema.parse(route.response), answer, path);
}

async function askPath(ask: Ask, { schema = ANY_BODY, ...request }: ApiRequest): Promise<unknown> {
  return parseResponse(schema, await ask(request), request.path);
}

/**
 * The call() of one api client (docs/62 part 3 §3, §3b), bound once where the client is in scope:
 * each call takes one request object. The route form takes its path from the route and parses
 * the answer strictly with the route's own schema; the path form parses with `schema` when given.
 */
export function callWith(api: ApiClient | Requester): Call {
  const ask = askVia(api);
  function call<R extends CallableRoute>(request: CallRequest<R>): Promise<RouteResult<R>>;
  function call<S extends z.ZodType>(request: SchemaRequest<S>): Promise<z.output<S>>;
  function call<T = unknown>(request: ApiRequest): Promise<T>;
  function call(request: AnyCallRequest | ApiRequest): Promise<unknown> {
    return isRouteRequest(request) ? askRoute(ask, request) : askPath(ask, request);
  }
  return call;
}
