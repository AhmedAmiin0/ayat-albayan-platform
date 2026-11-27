import { z } from 'zod';
import { pathParamNames } from './route-path';
import { routeMethodSchema, routePublicSchema } from './route.schemas';
import type { Route, RouteSpec } from './route.types';

const LISTS = ['permissions', 'tags'] as const;

const sameNames = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name) => b.includes(name));

const schemaKeys = (params: RouteSpec['params']): string[] =>
  params instanceof z.ZodObject ? Object.keys(params.shape) : [];

const labelOf = (spec: RouteSpec): string => `defineRoute ${spec.method} ${spec.path}`;

const isBadList = (list: readonly string[] | undefined): boolean =>
  list !== undefined && (list.length === 0 || new Set(list).size !== list.length);

function checkParams(spec: RouteSpec): void {
  const inPath = pathParamNames(spec.path);
  const inSchema = schemaKeys(spec.params);
  if (sameNames(inPath, inSchema)) return;
  const names = `path params [${inPath.join(',')}] differ from schema params [${inSchema.join(',')}]`;
  throw new Error(`${labelOf(spec)}: ${names}`);
}

function checkLists(spec: RouteSpec): void {
  const bad = LISTS.filter((name) => isBadList(spec[name]));
  if (bad.length === 0) return;
  throw new Error(`${labelOf(spec)}: ${bad.join(', ')} must be a non-empty list without duplicates`);
}

const isPublicWithPermissions = (spec: RouteSpec): boolean =>
  routePublicSchema.parse(spec).isPublic === true && spec.permissions !== undefined;

function checkPublic(spec: RouteSpec): void {
  if (!isPublicWithPermissions(spec)) return;
  throw new Error(`${labelOf(spec)}: a public route cannot name permissions`);
}

/** A frozen route object, typed by its own schemas (docs/62 part 3 §1). */
export function defineRoute<const S extends RouteSpec>(spec: S): Route<S> {
  routeMethodSchema.parse(spec.method);
  checkParams(spec);
  checkLists(spec);
  checkPublic(spec);
  return Object.freeze({ ...spec });
}
