import { fillRoutePath, type RouteResult } from '@ab/core';
import { z } from 'zod';
import { parseResponse, type ApiClient, type Requester } from '../api-client';
import { askVia } from './ask';
import { toQueryString } from '../query-string';
import type { AnyCallRequest, Ask, Call, CallableRoute, CallRequest } from './call.types';

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

function urlOf({ route, params, query }: AnyCallRequest): string {
  const search = toQueryString(querySchema.parse(query));
  return `${fillRoutePath(route.path, params)}${search}`;
}

function askRoute<R extends CallableRoute>(
  ask: Ask,
  request: CallRequest<R>,
): Promise<RouteResult<R>>;
async function askRoute(ask: Ask, { route, body, ...rest }: AnyCallRequest): Promise<unknown> {
  const path = urlOf({ route, ...rest });
  const answer = await ask({ method: route.method, path, body });
  return parseResponse(answerSchema.parse(route.response), answer, path);
}

/**
 * The call() of one api client (docs/62 part 3 §3), bound once where the client is in scope: each
 * call takes one request, the route object and its inputs. The path comes from the route, the
 * answer is parsed strictly with the route's own schema by call() itself, so the client's request
 * carries no schema.
 */
export function callWith(api: ApiClient | Requester): Call {
  const ask = askVia(api);
  return (request) => askRoute(ask, request);
}
