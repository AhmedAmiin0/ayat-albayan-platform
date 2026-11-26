import { ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { pageQuery } from '@ab/core';
import { z } from 'zod';
import { orFilterTerm } from '@/common/db/or-filter';
import { pgError, UNIQUE_VIOLATION, type PgErrorMap } from '@/common/db/errors';

const PERSON_ERRORS: PgErrorMap = {
  codes: { [UNIQUE_VIOLATION]: () => new ConflictException({ code: 'duplicate_phone' }) },
};

/** A phone that already exists answers 409 `duplicate_phone`; the rest the default map. */
export function throwIfDbError(error: PostgrestError | null): asserts error is null {
  if (error) throw pgError(error, PERSON_ERRORS);
}

/** Pagination + search shared by the list endpoints (R-NFR-08). */
export const pageQueryShape = {
  ...pageQuery({ size: 25 }),
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

