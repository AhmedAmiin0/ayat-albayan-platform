import { pageOf, type Page } from '@ab/core';
import { leadListItemSchema, type LeadListItem } from '@ab/shared';
import { z } from 'zod';
import { asResponse } from '@/common/http/returns';
import type { LeadListRow } from './leads.types';

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
