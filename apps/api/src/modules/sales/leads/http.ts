import { ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import { orFilterTerm } from '@/common/db/or-filter';

// ponytail: shared by leads + job-applicants only; hoist to common/ when a third module needs it.

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
    .transform((v) => (v ? orFilterTerm(v) : '') || undefined),
};
export interface PageQuery {
  page: number;
  pageSize: number;
  q?: string;
}

