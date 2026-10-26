import { searchDigits, type APPLICANT_SORT_KEYS, type ListSort, type PresenceFilter } from '@ab/shared';
import { ilikeContains, type SortSpec } from '../../../common/list-sort';

type ApplicantSortKey = (typeof APPLICANT_SORT_KEYS)[number];

/** Column filters + sort of GET /job-applicants (R-LEAD-04, R-NFR-08); status is its own param. */
export type ApplicantColumnQuery = ListSort<ApplicantSortKey> & {
  name?: string | undefined;
  phone?: string | undefined;
  cv?: PresenceFilter | undefined;
  recitation?: PresenceFilter | undefined;
  notes?: string | undefined;
};

/** Sort key → job_applicants column; newest first by default (and as the tiebreaker). */
export const APPLICANT_SORT: SortSpec<ApplicantSortKey> = {
  columns: {
    name: { column: 'name', nullsFirst: false },
    phone: { column: 'phone_e164' },
    status: { column: 'status' },
    cv: { column: 'cv_url', nullsFirst: false },
    recitation: { column: 'recitation_url', nullsFirst: false },
    notes: { column: 'notes', nullsFirst: false },
    created_at: { column: 'created_at' },
  },
  fallback: { column: 'created_at', ascending: false },
};

interface ApplicantFilterable<Q> {
  ilike(column: string, pattern: string): Q;
  is(column: string, value: null): Q;
  not(column: string, operator: string, value: null): Q;
}

function presence<Q extends ApplicantFilterable<Q>>(q: Q, column: string, want: PresenceFilter | undefined): Q {
  if (want === 'yes') return q.not(column, 'is', null);
  if (want === 'no') return q.is(column, null);
  return q;
}

/** Name / notes «contains», phone digits in any format, CV / recitation link present or not. */
export function applyApplicantFilters<Q extends ApplicantFilterable<Q>>(query: Q, f: ApplicantColumnQuery): Q {
  let q = query;
  if (f.name) q = q.ilike('name', ilikeContains(f.name));
  if (f.phone) q = q.ilike('phone_e164', ilikeContains(searchDigits(f.phone) || f.phone));
  if (f.notes) q = q.ilike('notes', ilikeContains(f.notes));
  q = presence(q, 'cv_url', f.cv);
  return presence(q, 'recitation_url', f.recitation);
}
