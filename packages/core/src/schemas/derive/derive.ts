import { z } from 'zod';
import type { PartialOf, ResolvedObject, Wrapper } from './derive.types';

const isDefaulted = (field: z.core.$ZodType): field is z.ZodDefault | z.ZodPrefault =>
  field instanceof z.ZodDefault || field instanceof z.ZodPrefault;

const withoutDefault = (field: z.core.$ZodType): z.core.$ZodType =>
  isDefaulted(field) ? field.unwrap() : field;

/** `base.partial()` without its defaults: a PATCH of one field never resets another. */
export function partialOf<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig>(
  base: z.ZodObject<S, C>,
): PartialOf<S, C> {
  // zod's own error would advise .safeExtend(), which keeps the refine on a partial body.
  if (base.def.checks?.length) throw new Error('partialOf: refine the edge schema, not the base');
  const fields = Object.entries(base.shape).map(([key, f]) => [key, z.optional(withoutDefault(f))]);
  return base.extend(Object.fromEntries(fields));
}

/** The empty-update rule of PATCH bodies; each schema keeps its own message. */
export const hasAnyValue = (body: object): boolean =>
  Object.values(body).some((value) => value !== undefined);

const WRAPPERS = [z.ZodOptional, z.ZodNullable, z.ZodDefault, z.ZodPrefault];

const isWrapper = (schema: z.core.$ZodType): schema is Wrapper<z.core.$ZodType> =>
  WRAPPERS.some((kind) => schema instanceof kind);

const pipeSide = (pipe: z.ZodPipe): z.core.$ZodType =>
  pipe.in instanceof z.ZodTransform ? pipe.out : pipe.in;

function innerOf(schema: z.core.$ZodType): z.core.$ZodType {
  if (isWrapper(schema)) return schema.unwrap();
  if (schema instanceof z.ZodPipe) return pipeSide(schema);
  throw new Error('resolveObject: no object behind this schema');
}

/** The object behind optional, nullable, default, prefault, preprocess and transform. */
export function resolveObject<T extends z.core.$ZodType>(schema: T): ResolvedObject<T> {
  let current: z.core.$ZodType = schema;
  while (!(current instanceof z.ZodObject)) current = innerOf(current);
  // The loop takes ResolvedObject's branches one for one (derive.types.test).
  return current as unknown as ResolvedObject<T>;
}
