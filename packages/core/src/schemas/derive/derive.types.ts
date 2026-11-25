import type { z } from 'zod';

/** A field without its top-level `.default()` or `.prefault()`. */
export type NoDefault<T extends z.core.SomeType> =
  T extends z.ZodDefault<infer I extends z.core.SomeType>
    ? I
    : T extends z.ZodPrefault<infer I extends z.core.SomeType>
      ? I
      : T;

export type PartialOf<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig> = z.ZodObject<
  { -readonly [K in keyof S]: z.ZodOptional<NoDefault<S[K]>> },
  C
>;

export type Wrapper<I extends z.core.SomeType> =
  | z.ZodOptional<I>
  | z.ZodNullable<I>
  | z.ZodDefault<I>
  | z.ZodPrefault<I>;

/** A preprocess reads its output side, a transform its input side. */
export type ResolvedObject<T> = T extends z.ZodObject
  ? T
  : T extends z.ZodPreprocess<infer B>
    ? ResolvedObject<B>
    : T extends z.ZodPipe<infer A, z.core.SomeType>
      ? ResolvedObject<A>
      : T extends Wrapper<infer I>
        ? ResolvedObject<I>
        : never;
