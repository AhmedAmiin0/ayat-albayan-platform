import { LEAD_SOURCES, LEAD_STATUSES, type LeadSource, type LeadStatus } from '@ab/shared';

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
  /** The salesperson's profile id (null = nobody yet) and name; absent from older payloads. */
  assigned_to?: string | null;
  assigned_to_name?: string | null;
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

/** Inbox URL state: status tab, source filter, name/phone search, page (server-side, R-NFR-08). */
export type LeadSearch = { status?: LeadStatus; source?: LeadSource; q?: string; page: number };
export type PageSearch = { page: number };

function toPage(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Route `validateSearch`: unknown status/source → all, blank search dropped, bad page → 1. */
export function parseLeadSearch(s: Record<string, unknown>): LeadSearch {
  const out: LeadSearch = { page: toPage(s['page']) };
  const status = LEAD_STATUSES.find((x) => x === s['status']);
  const source = LEAD_SOURCES.find((x) => x === s['source']);
  const q = typeof s['q'] === 'string' ? s['q'].trim() : '';
  if (status) out.status = status;
  if (source) out.source = source;
  if (q) out.q = q;
  return out;
}

export function parsePageSearch(s: Record<string, unknown>): PageSearch {
  return { page: toPage(s['page']) };
}
