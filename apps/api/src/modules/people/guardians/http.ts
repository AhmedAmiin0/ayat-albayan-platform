import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import type { PgErrorMap } from '@/common/db/errors';
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
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** Inclusive row range for supabase-js `.range(from, to)`. */
export function pageRange(q: ListQuery): [number, number] {
  const from = (q.page - 1) * q.pageSize;
  return [from, from + q.pageSize - 1];
}

/** Drops characters that would break a PostgREST `or=(...)` filter. */
export function orSafe(term: string): string {
  return term.replace(/[,()*%\\:"]/g, ' ').trim();
}


const internal = (e: PostgrestError) => new InternalServerErrorException(e.message);
const badRequest = (e: PostgrestError) => new BadRequestException(e.message);
const notFound = () => new NotFoundException();

/** The people modules' answers: a conflict names its code, and every other error is a 500. */
export function peopleErrors(conflict = 'conflict'): PgErrorMap {
  const taken = () => new ConflictException(conflict);
  return {
    codes: {
      '23505': taken,
      '23503': taken,
      P0002: notFound,
      PGRST116: notFound,
      '22023': badRequest,
      '23514': badRequest,
      PGRST103: internal,
    },
    otherwise: internal,
  };
}
