import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ListUrlState } from '@/lib/list/list-url';
import type { JobApplicantRow, LeadRow, LeadSearch, Page } from './types';

export const PAGE_SIZE = 25;

export const leadsQuery = (s: LeadSearch) =>
  queryOptions({
    queryKey: ['leads', s],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(s.page), pageSize: String(PAGE_SIZE) });
      if (s.status) params.set('status', s.status);
      if (s.source) params.set('source', s.source);
      if (s.q) params.set('q', s.q);
      if (s.assignee) params.set('assignee', s.assignee);
      if (s.sort) params.set('sort', s.sort);
      if (s.sort && s.dir) params.set('dir', s.dir);
      return apiFetch<Page<LeadRow>>(`/leads?${params}`);
    },
    // A filter/page switch keeps the old rows (dimmed, aria-busy) until the new page lands.
    placeholderData: keepPreviousData,
  });

/** GET /job-applicants: page, column sort and filters (R-NFR-08). */
export const jobApplicantsQuery = (s: ListUrlState) =>
  queryOptions({
    queryKey: ['job-applicants', s],
    queryFn: () => {
      const qs = new URLSearchParams([['page', String(s.page)], ['pageSize', String(PAGE_SIZE)], ...sortFilterParams(s.sort, s.filters)]);
      return apiFetch<Page<JobApplicantRow>>(`/job-applicants?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

/** R-LEAD-04: one-click move of a lead into job applicants. */
export const reclassifyLead = (id: string) =>
  apiSend<JobApplicantRow>('POST', `/leads/${id}/reclassify`);
