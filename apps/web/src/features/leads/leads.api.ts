import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import type { JobApplicantRow, LeadRow, LeadSearch, Page, PageSearch } from './types';

export const PAGE_SIZE = 25;

export const leadsQuery = (s: LeadSearch) =>
  queryOptions({
    queryKey: ['leads', s],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(s.page), pageSize: String(PAGE_SIZE) });
      if (s.status) params.set('status', s.status);
      return apiFetch<Page<LeadRow>>(`/leads?${params}`);
    },
  });

export const jobApplicantsQuery = (s: PageSearch) =>
  queryOptions({
    queryKey: ['job-applicants', s],
    queryFn: () =>
      apiFetch<Page<JobApplicantRow>>(`/job-applicants?page=${s.page}&pageSize=${PAGE_SIZE}`),
  });

/** R-LEAD-04: one-click move of a lead into job applicants. */
export const reclassifyLead = (id: string) =>
  apiSend<JobApplicantRow>('POST', `/leads/${id}/reclassify`);
