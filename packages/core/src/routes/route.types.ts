import type { z } from 'zod';
import type { RouteAnswer, RouteMethod } from './route.schemas';

/**
 * One API route as both sides read it: method, full path with `:name` params, and the schemas of
 * its inputs and answer. Access rules (permissions, guards, throttles) never live here.
 */
export interface RouteSpec {
  method: RouteMethod;
  path: string;
  params?: z.ZodType<object>;
  query?: z.ZodType<object>;
  body?: z.ZodType;
  response: z.ZodType | RouteAnswer;
}

export type Route<S extends RouteSpec = RouteSpec> = Readonly<S>;

type InputOf<R, K extends 'params' | 'query' | 'body'> =
  R extends Record<K, infer S extends z.ZodType> ? z.input<S> : undefined;

export type RouteParams<R extends RouteSpec> = InputOf<R, 'params'>;
export type RouteQuery<R extends RouteSpec> = InputOf<R, 'query'>;
export type RouteBody<R extends RouteSpec> = InputOf<R, 'body'>;

/** What a client gets back: the parsed answer, or nothing for a route without a JSON body. */
export type RouteResult<R extends RouteSpec> = R['response'] extends z.ZodType
  ? z.output<R['response']>
  : undefined;

/** The `:name` values of a route; a route without params takes none. */
export type RoutePathArgs<R extends RouteSpec> =
  RouteParams<R> extends undefined ? [] : [params: RouteParams<R>];
