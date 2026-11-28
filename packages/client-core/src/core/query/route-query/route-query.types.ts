import type { Route, RouteSpec } from '@ab/core';
import type { z } from 'zod';

/** A read whose answer is JSON, so a cache entry has a value to hold. */
export type QuerySpec = RouteSpec & { response: z.ZodType };

/** TanStack hands its signal over, so a dropped query stops its fetch. */
export interface RouteQueryContext {
  signal?: AbortSignal | undefined;
}

/** The queryOptions of one route read, typed by the route's response schema. */
export interface RouteQueryOptions<S extends QuerySpec> {
  queryKey: unknown[];
  queryFn: (context?: RouteQueryContext) => Promise<z.output<S['response']>>;
}

export type QueryRoute<S extends QuerySpec> = Route<S>;
