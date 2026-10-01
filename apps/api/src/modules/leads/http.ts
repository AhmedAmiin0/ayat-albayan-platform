import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

// ponytail: shared by leads + job-applicants only; hoist to common/ when a third module needs it.

/** Zod-validate a request body/query; invalid input is a 400, never a 500. */
export function parseOr400<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new BadRequestException({ code: 'validation', issues: r.error.issues });
  return r.data;
}

/** Unique-violation (phone already exists) → 409; any other DB error → 500. */
export function throwIfDbError(error: PostgrestError | null): asserts error is null {
  if (!error) return;
  if (error.code === '23505') throw new ConflictException({ code: 'duplicate_phone' });
  throw new Error(`db: ${error.message}`);
}

/** Pagination + search shared by the list endpoints (R-NFR-08). */
export const pageQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z
    .string()
    .optional()
    .transform((v) => (v ? searchTerm(v) : '') || undefined),
};
export interface PageQuery {
  page: number;
  pageSize: number;
  q?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Strip PostgREST `or()` syntax characters so free text cannot break or widen the filter. */
export function searchTerm(q: string): string {
  return q.replace(/[,()*%\\:"]/g, ' ').trim();
}

export function pageRange({ page, pageSize }: PageQuery): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}
