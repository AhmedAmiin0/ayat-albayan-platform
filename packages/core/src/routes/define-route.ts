import { z } from 'zod';
import { pathParamNames } from './route-path';
import { routeMethodSchema } from './route.schemas';
import type { Route, RouteSpec } from './route.types';

const sameNames = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name) => b.includes(name));

const schemaKeys = (params: RouteSpec['params']): string[] =>
  params instanceof z.ZodObject ? Object.keys(params.shape) : [];

function checkParams(spec: RouteSpec): void {
  const inPath = pathParamNames(spec.path);
  const inSchema = schemaKeys(spec.params);
  if (sameNames(inPath, inSchema)) return;
  const label = `defineRoute ${spec.method} ${spec.path}`;
  const names = `path params [${inPath.join(',')}] differ from schema params [${inSchema.join(',')}]`;
  throw new Error(`${label}: ${names}`);
}

/** A frozen route object, typed by its own schemas (docs/62 part 3 §1). */
export function defineRoute<const S extends RouteSpec>(spec: S): Route<S> {
  routeMethodSchema.parse(spec.method);
  checkParams(spec);
  return Object.freeze({ ...spec });
}
