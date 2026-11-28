import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ListUrlState } from '@/lib/list/list-url';
import type { LeadSearch } from './types';
import { jobApplicantCalls, leadReadCalls, leadWriteCalls } from '@ab/client-core';
import { jobApplicantListQuerySchema } from '@ab/shared';
import { applicantKeys, leadKeys } from '@/features/sales/keys';

export const PAGE_SIZE = 25;

const applicants = jobApplicantCalls({ apiFetch, apiSend });
const leadWrites = leadWriteCalls({ apiFetch, apiSend });
const leadReads = leadReadCalls({ apiFetch, apiSend });

export const leadsQuery = (s: LeadSearch) =>
  queryOptions({
    queryKey: leadKeys.list(s),
    queryFn: () => {
      const { page, status, source, q, assignee, sort, dir } = s;
      const query = { page, pageSize: PAGE_SIZE, status, source, q, assignee, sort, dir };
      return leadReads.list(query);
    },
    // A filter/page switch keeps the old rows (dimmed, aria-busy) until the new page lands.
    placeholderData: keepPreviousData,
  });

/** GET /job-applicants: page, column sort and filters (R-NFR-08). */
export const jobApplicantsQuery = (s: ListUrlState) =>
  queryOptions({
    queryKey: applicantKeys.list(s),
    queryFn: () => {
      const params = Object.fromEntries(sortFilterParams(s.sort, s.filters));
      const page = { page: s.page, pageSize: PAGE_SIZE };
      return applicants.list(jobApplicantListQuerySchema.parse({ ...page, ...params }));
    },
    placeholderData: keepPreviousData,
  });

/** R-LEAD-04: one-click move of a lead into job applicants. */
export const reclassifyLead = leadWrites.reclassify;
