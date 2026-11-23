import { NO_ASSIGNEE } from '@ab/shared';
import { LEAD_SOURCES, LEAD_STATUSES, type LeadSource, type LeadStatus } from '@ab/catalog';
import { parseLeadSort, type LeadSort } from '@ab/client-core';

/**
 * Inbox URL state: status tab, source and «مسؤول المبيعات» filters, name/phone search, order and
 * page (server-side, R-NFR-08). `assignee` is a profile id or `none`.
 */
export type LeadSearch = LeadSort & { status?: LeadStatus; source?: LeadSource; q?: string; assignee?: string; page: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PageSearch = { page: number };

function toPage(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Route `validateSearch`: unknown status/source/assignee/sort → all, blank search dropped, bad page → 1. */
export function parseLeadSearch(s: Record<string, unknown>): LeadSearch {
  const out: LeadSearch = { page: toPage(s['page']), ...parseLeadSort(s['sort'], s['dir']) };
  const assignee = s['assignee'];
  if (typeof assignee === 'string' && (assignee === NO_ASSIGNEE || UUID.test(assignee))) out.assignee = assignee;
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
