import type {
  RouteAnswer,
  RouteBody,
  RouteParams,
  RouteQuery,
  RouteResult,
  RouteSpec,
} from '@ab/core';
import type { z } from 'zod';

/** A route a client can call: it answers JSON or nothing (a file or redirect uses routePath). */
export type CallableRoute = RouteSpec & { response: z.ZodType | Extract<RouteAnswer, 'empty'> };

type Part<K extends string, V> = [V] extends [undefined]
  ? Partial<Record<K, undefined>>
  : Record<K, V>;

/** What call() reads at run time, whatever the route. */
export interface AnyCallRequest {
  route: CallableRoute;
  params?: unknown;
  query?: unknown;
  body?: unknown;
}

/** The route's inputs, each typed by its schema's input; a part the route lacks is left out. */
export type CallInput<R extends RouteSpec> = Part<'params', RouteParams<R>> &
  Part<'query', RouteQuery<R>> &
  Part<'body', RouteBody<R>>;

/** R is read from `route` only (NoInfer), so a wrong input is an error, never a wider R. */
export type CallRequest<R extends CallableRoute> = { route: R } & NoInfer<CallInput<R>>;

/** Bound once per api client (docs/62 part 3 §3). */
export type Call = <R extends CallableRoute>(request: CallRequest<R>) => Promise<RouteResult<R>>;
