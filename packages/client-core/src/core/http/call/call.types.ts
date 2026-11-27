import type {
  RouteAnswer,
  RouteBody,
  RouteParams,
  RouteQuery,
  RouteResult,
  RouteSpec,
} from '@ab/core';
import type { z } from 'zod';
import type { ApiRequest, SchemaRequest } from '../api-client';

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
  signal?: AbortSignal | null | undefined;
}

/** The route's inputs, each typed by its schema's input; a part the route lacks is left out. */
export type CallInput<R extends RouteSpec> = Part<'params', RouteParams<R>> &
  Part<'query', RouteQuery<R>> &
  Part<'body', RouteBody<R>>;

/**
 * R is read from `route` only (NoInfer), so a wrong input is an error, never a wider R. `signal`:
 * the caller's abort (a query nobody shows drops its read).
 */
export type CallRequest<R extends CallableRoute> = {
  route: R;
  signal?: AbortSignal | null | undefined;
} & NoInfer<CallInput<R>>;

/**
 * Bound once per api client (docs/62 part 3 §3, §3b): the route form, or the path form for a call
 * whose route object does not exist yet, parsed by its `schema` or typed by the caller.
 */
export interface Call {
  <R extends CallableRoute>(request: CallRequest<R>): Promise<RouteResult<R>>;
  <S extends z.ZodType>(request: SchemaRequest<S>): Promise<z.output<S>>;
  <T = unknown>(request: ApiRequest): Promise<T>;
}

/** What call() hands an api client: the answer is parsed by call() itself. */
export type AskRequest = Omit<ApiRequest, 'schema'>;

export type Ask = (request: AskRequest) => Promise<unknown>;
