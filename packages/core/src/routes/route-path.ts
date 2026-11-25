import { z } from 'zod';
import type { RoutePathArgs, RouteSpec } from './route.types';

const PARAM = /:([A-Za-z_]\w*)/g;
const paramsSchema = z.record(z.string(), z.unknown()).default({});

/** The `:name` segments of a path, in order. */
export function pathParamNames(path: string): string[] {
  return [...path.matchAll(PARAM)].flatMap((match) => match.slice(1, 2));
}

const filled = (value: unknown): boolean => value !== undefined && value !== null && value !== '';

function fillPath(path: string, params: Record<string, unknown>): string {
  const values = new Map(Object.entries(params));
  const names = pathParamNames(path);
  const missing = names.filter((name) => !filled(values.get(name)));
  const extra = [...values.keys()].filter((key) => !names.includes(key));
  if (missing.length + extra.length > 0) {
    throw new Error(`routePath ${path}: missing [${missing.join(',')}] extra [${extra.join(',')}]`);
  }
  const fill = (_: string, name: string): string => encodeURIComponent(String(values.get(name)));
  return path.replace(PARAM, fill);
}

/** The route's path with each `:name` filled and URI-encoded; a missing or extra param throws. */
export function routePath<R extends RouteSpec>(route: R, ...args: RoutePathArgs<R>): string {
  const given: readonly unknown[] = args;
  return fillPath(route.path, paramsSchema.parse(given[0]));
}
