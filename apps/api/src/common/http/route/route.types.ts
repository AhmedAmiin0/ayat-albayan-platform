import type { RouteSpec } from '@ab/core';
import type { z } from 'zod';
import type { ParamFailure } from '@/common/http/zod-inputs';

type OutputOf<R, K extends 'params' | 'query' | 'body'> =
  R extends Record<K, infer S extends z.ZodType> ? z.output<S> : undefined;

/** What a handler gets from @RouteInput(): each part parsed by the route's own schema. */
export interface RouteInputOf<R extends RouteSpec> {
  params: OutputOf<R, 'params'>;
  query: OutputOf<R, 'query'>;
  body: OutputOf<R, 'body'>;
}

export interface RouteInputOptions {
  /** The route's own error for a bad `:param` (a 404 code); default the 400 envelope. */
  badParam?: ParamFailure;
  /** Each `:param` is checked alone before the body and query: a bad one wins, issue path ''. */
  paramsFirst?: true;
  /** With `paramsFirst`: a server-only rule a `:param` must also pass (an env-gated key). */
  paramChecks?: Readonly<Record<string, z.ZodType>>;
  /**
   * After the body and query, these `:param`s are each checked alone, in this order, before the
   * rest: the first bad one answers its own error (or the 400 envelope, issue path '').
   */
  paramErrors?: readonly ParamError[];
}

/** A `:param` checked alone, with the route's own error for it. */
export interface ParamError {
  name: string;
  fail?: ParamFailure;
}

/** The request parts @RouteInput() reads, with the route of the handler. */
export interface RawRouteInput {
  route: RouteSpec;
  params: unknown;
  query: unknown;
  body: unknown;
}
