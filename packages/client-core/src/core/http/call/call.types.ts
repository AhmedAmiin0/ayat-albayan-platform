import type { RouteAnswer, RouteBody, RouteParams, RouteQuery, RouteSpec } from '@ab/core';
import type { z } from 'zod';

/** A route a client can call: it answers JSON or nothing (a file or redirect uses routePath). */
export type CallableRoute = RouteSpec & { response: z.ZodType | Extract<RouteAnswer, 'empty'> };

type Part<K extends string, V> = [V] extends [undefined]
  ? Partial<Record<K, undefined>>
  : Record<K, V>;

/** What call() reads at run time, whatever the route. */
export interface AnyCallInput {
  params?: unknown;
  query?: unknown;
  body?: unknown;
}

/** The route's inputs, each typed by its schema's input; a part the route lacks is left out. */
export type CallInput<R extends RouteSpec> = Part<'params', RouteParams<R>> &
  Part<'query', RouteQuery<R>> &
  Part<'body', RouteBody<R>>;
