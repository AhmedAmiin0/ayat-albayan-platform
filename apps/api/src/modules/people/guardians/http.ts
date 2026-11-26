import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { type PgErrorMap, UNIQUE_VIOLATION } from '@/common/db/errors';
import { pageQuery } from '@ab/core';
import { z } from 'zod';

// Request helpers shared by the guardians and students modules.
// ponytail: lives here until a second feature needs it; then move to common/.

/** Forms send '' for "not set"; the shared schemas expect null. Recurses into nested objects. */
export function blankToNull(input: unknown): unknown {
  if (input === '') return null;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, blankToNull(v)]));
}

/** The schema with `blankToNull` applied first: a body for `@ZodBody`. */
export const blanksToNull = <S extends z.ZodType>(schema: S) => z.preprocess(blankToNull, schema);

/** Every list endpoint is paginated (R-NFR-08). */
export const listQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  ...pageQuery({ size: 20 }),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

const badRequest = (e: PostgrestError) => new BadRequestException(e.message);
const notFound = () => new NotFoundException();

/** The people modules' codes on top of the default map: a conflict names its code. */
export function peopleErrors(conflict = 'conflict'): PgErrorMap {
  const taken = () => new ConflictException(conflict);
  return {
    codes: {
      [UNIQUE_VIOLATION]: taken,
      '23503': taken,
      P0002: notFound,
      PGRST116: notFound,
      '22023': badRequest,
      '23514': badRequest,
    },
  };
}
