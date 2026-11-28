import { pathParamNames, type RouteKeyInput } from '@ab/core';
import { callWith, routeUrl, type ApiClient, type Requester } from '../../http';
import type { QueryRoute, QuerySpec, RouteQueryOptions } from './route-query.types';

const partsOf = (path: string, input: object) => {
  const names = new Set(pathParamNames(path));
  const entries = Object.entries(input);
  return {
    params: Object.fromEntries(entries.filter(([name]) => names.has(name))),
    query: Object.fromEntries(entries.filter(([name]) => !names.has(name))),
  };
};

/**
 * The queryOptions of one read (docs/62 part 3 §3b): keyed by the route's own key and the input,
 * asked on the route's URL and parsed by its response schema, so key and request never drift.
 */
export function routeQuery<S extends QuerySpec>(
  client: ApiClient | Requester,
  route: QueryRoute<S>,
  input: RouteKeyInput<S>,
): RouteQueryOptions<S> {
  const call = callWith(client);
  const path = routeUrl({ route, ...partsOf(route.path, input ?? {}) });
  return {
    queryKey: route.key.of(input),
    queryFn: (context) =>
      call({ method: route.method, path, schema: route.response, signal: context?.signal }),
  };
}
