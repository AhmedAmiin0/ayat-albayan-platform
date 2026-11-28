import { z } from 'zod';

const plainObject = z.record(z.string(), z.unknown());

/** Forms send '' for «not set»; the shared schemas expect null. Recurses into nested objects. */
export function blankToNull(input: unknown): unknown {
  if (input === '') return null;
  const object = plainObject.safeParse(input);
  if (!object.success) return input;
  return Object.fromEntries(Object.entries(object.data).map(([k, v]) => [k, blankToNull(v)]));
}

/** The schema with `blankToNull` applied first; its input stays the schema's own input. */
export function blanksToNull<S extends z.ZodType>(schema: S): z.ZodPreprocess<S, z.input<S>> {
  return z.preprocess((value: z.input<S>) => blankToNull(value), schema);
}
