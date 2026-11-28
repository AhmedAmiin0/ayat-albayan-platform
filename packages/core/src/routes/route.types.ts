import type { z } from 'zod';
import type { RouteAnswer, RouteMethod } from './route.schemas';

/** A list a route object names at least one entry of, each once. */
export type RouteList = readonly [string, ...string[]];

/**
 * One API route as both sides read it: method, full path with `:name` params, the schemas of its
 * inputs and answer, the permissions that let a caller in (any one of them), its Swagger tags and
 * whether it is public (`isPublic`: no sign-in, never beside `permissions`). Guards, throttles,
 * `@SignedIn` and `@HttpCode` stay on the api handler.
 * Permission keys are plain strings here; the api's coverage test checks them against the catalog.
 */
export interface RouteSpec {
  method: RouteMethod;
  path: string;
  params?: z.ZodType<object>;
  query?: z.ZodType<object>;
  body?: z.ZodType;
  response: z.ZodType | RouteAnswer;
  readonly permissions?: RouteList;
  readonly tags?: RouteList;
  readonly isPublic?: true;
}

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

type Or<T, Else> = [T] extends [undefined] ? Else : T;
type NoInput = Partial<Record<string, never>>;
type Joined<P, Q> = [P] extends [undefined] ? Or<Q, NoInput> : P & Or<Q, unknown>;

/** What a read's cache entry is keyed by: the route's params and query, as one object. */
export type RouteKeyInput<R extends RouteSpec> = Joined<RouteParams<R>, RouteQuery<R>>;

/** Invalidating `all` reaches every `of` entry of the route and of the paths under it. */
export interface RouteKey<R extends RouteSpec = RouteSpec> {
  readonly all: readonly string[];
  of(input: RouteKeyInput<R>): unknown[];
}

export type Route<S extends RouteSpec = RouteSpec> = Readonly<S> & { readonly key: RouteKey<S> };
