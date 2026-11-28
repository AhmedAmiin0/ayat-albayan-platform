import type { RouteKey, RouteKeyInput, RouteSpec } from './route.types';

/** A path's segments: a key under another route's segments is one its prefix invalidates. */
export function pathKey(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** The query key of a route (docs/27 §2.3): its path key, then the params and query it read. */
export function routeKey<S extends RouteSpec>(spec: S): RouteKey<S> {
  const all = Object.freeze(pathKey(spec.path));
  const of = (input: RouteKeyInput<S>): unknown[] => [...all, input];
  return Object.freeze({ all, of });
}
