import type { LeadSource, LeadStatus } from '@ab/shared';
import type { ListParams } from '@/lib/query-keys';
import { leadSortValue, type LeadSort } from './lead-sort';

/** The inbox's own filters beside the status pills and the search (the web LeadSearch minus paging). */
export type LeadFilters = LeadSort & { source?: LeadSource; assignee?: string };

export const NO_FILTERS: LeadFilters = {};

export interface LeadListQuery {
  q: string;
  status: LeadStatus | 'all';
  filters: LeadFilters;
}

/** GET /leads query params, named as the web inbox sends them; blank values are left out. */
export function leadListParams({ q, status, filters }: LeadListQuery): ListParams {
  const { source, assignee, sort, dir } = filters;
  return {
    q,
    status: status === 'all' ? undefined : status,
    source,
    assignee,
    sort,
    dir: sort ? dir : undefined,
  };
}

/** How many of source / assignee / order are set: the number on «تصفية (n)». */
export function activeFilterCount({ source, assignee, sort, dir }: LeadFilters): number {
  return [source, assignee, leadSortValue({ sort, dir })].filter(Boolean).length;
}
