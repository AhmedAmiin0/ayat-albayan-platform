import { ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { orFilterTerm } from '@/common/db/or-filter';
import { pgError, UNIQUE_VIOLATION, type PgErrorMap } from '@/common/db/errors';
import { pageOf, type Page } from '@ab/core';
import { leadListItemSchema, type LeadListItem } from '@ab/shared';
import { z } from 'zod';
import { asResponse } from '@/common/http/returns';
import type { LeadListRow } from './leads.types';

const PERSON_ERRORS: PgErrorMap = {
  codes: { [UNIQUE_VIOLATION]: () => new ConflictException({ code: 'duplicate_phone' }) },
};

/** A phone that already exists answers 409 `duplicate_phone`; the rest the default map. */
export function throwIfDbError(error: PostgrestError | null): asserts error is null {
  if (error) throw pgError(error, PERSON_ERRORS);
}

/** The list search text with PostgREST or() syntax taken out; nothing left means no search. */
export const searchTerm = (q?: string): string | undefined => orFilterTerm(q ?? '') || undefined;
export interface PageQuery {
  page: number;
  pageSize: number;
  q?: string;
}

const { shape } = leadListItemSchema;

// The note and pauser columns are text and qualification is any jsonb: each is read as stored and
// must still fit the answer's enum or be an object, else the answer is a 500.
const storedPage = pageOf(
  leadListItemSchema.extend({
    qualification: z.unknown().pipe(shape.qualification),
    follow_up_note: z.string().nullable().pipe(shape.follow_up_note),
    follow_up_paused_by: z.string().nullable().pipe(shape.follow_up_paused_by),
  }),
);

/** A GET /leads page held to its answer schema (R-LEAD-01). */
export const toLeadListPage = (page: Page<LeadListRow>): Page<LeadListItem> =>
  asResponse(storedPage, page);
