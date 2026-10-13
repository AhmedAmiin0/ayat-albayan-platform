import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

// Request helpers shared by the guardians and students modules.
// ponytail: lives here until a second feature needs it; then move to common/.

/** Parses a body/query with zod; 400 `validation_failed` with the issues otherwise. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const issues = r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  throw new BadRequestException({ message: 'validation_failed', issues });
}

/** Forms send '' for "not set"; the shared schemas expect null. Recurses into nested objects. */
export function blankToNull(input: unknown): unknown {
  if (input === '') return null;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, blankToNull(v)]));
}

/** Every list endpoint is paginated (R-NFR-08). */
export const listQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Inclusive row range for supabase-js `.range(from, to)`. */
export function pageRange(q: ListQuery): [number, number] {
  const from = (q.page - 1) * q.pageSize;
  return [from, from + q.pageSize - 1];
}

/** Drops characters that would break a PostgREST `or=(...)` filter, and the ilike wildcards `%` / `_`. */
export function orSafe(term: string): string {
  return term.replace(/[,()*%_\\:"]/g, ' ').trim();
}

type PgError = { code?: string; message: string };

/** Maps a Postgres/PostgREST error to an HTTP exception. */
export function dbError(error: PgError, conflict = 'conflict'): HttpException {
  switch (error.code) {
    case '23505': // unique_violation
    case '23503': // foreign_key_violation
      return new ConflictException(conflict);
    case 'P0002':
    case 'PGRST116':
      return new NotFoundException();
    case '22023':
    case '23514':
      return new BadRequestException(error.message);
    default:
      return new InternalServerErrorException(error.message);
  }
}
