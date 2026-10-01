import { LEAD_STATUSES, type LeadSource, type LeadStatus } from '@ab/shared';

// Row shapes returned by the API (`type`, not `interface`, for DataTable's RowData).
export type LeadRow = {
  id: string;
  phone_e164: string;
  name: string | null;
  source: LeadSource;
  status: LeadStatus;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
};

export type JobApplicantRow = {
  id: string;
  phone_e164: string;
  name: string | null;
  /** Includes the pipeline values added by migration 040 (reviewing, interview). */
  status: string;
  cv_url: string | null;
  recitation_url: string | null;
  notes: string | null;
  created_at: string;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Inbox URL state: status tab + page (server-side paging, R-NFR-08). */
export type LeadSearch = { status?: LeadStatus; page: number };
export type PageSearch = { page: number };

function toPage(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Route `validateSearch`: unknown status → all, bad page → 1. */
export function parseLeadSearch(s: Record<string, unknown>): LeadSearch {
  const status = LEAD_STATUSES.find((x) => x === s['status']);
  return status ? { status, page: toPage(s['page']) } : { page: toPage(s['page']) };
}

export function parsePageSearch(s: Record<string, unknown>): PageSearch {
  return { page: toPage(s['page']) };
}
