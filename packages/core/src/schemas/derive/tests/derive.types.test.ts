import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { partialOf, resolveObject } from '../derive';

const base = z.object({
  name: z.string(),
  status: z.enum(['active', 'paused']).default('active'),
});
const zodPartial = base.partial();

describe('derive types', () => {
  it('partialOf has the same input and output types as zod .partial()', () => {
    expectTypeOf<
      z.output<ReturnType<typeof partialOf<typeof base.shape, z.core.$strip>>>
    >().toEqualTypeOf<z.output<typeof zodPartial>>();
    expectTypeOf<
      z.input<ReturnType<typeof partialOf<typeof base.shape, z.core.$strip>>>
    >().toEqualTypeOf<z.input<typeof zodPartial>>();
  });

  it('partialOf keeps a strict config', () => {
    const strict = partialOf(base.strict());
    expectTypeOf(strict).toExtend<z.ZodObject<z.core.$ZodShape, z.core.$strict>>();
  });

  it('resolveObject reaches the object type behind a preprocess and an optional', () => {
    const wrapped = z.preprocess((v: z.input<typeof base>) => v, base.optional());
    expectTypeOf(resolveObject(wrapped)).toEqualTypeOf<typeof base>();
  });
});
