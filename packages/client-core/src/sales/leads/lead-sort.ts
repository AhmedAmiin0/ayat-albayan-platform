import { LEAD_SORT_KEYS, type LeadSortKey } from '@ab/shared';

/** A lead list order (R-NFR-08): no key = the inbox default, latest inbound message first. */
export interface LeadSort {
  sort?: LeadSortKey;
  dir?: 'desc';
}

/** URL / select value → sort; unknown keys → the default. */
export function parseLeadSort(sort: unknown, dir: unknown): LeadSort {
  const key = LEAD_SORT_KEYS.find((k) => k === sort);
  if (!key) return {};
  return dir === 'desc' ? { sort: key, dir: 'desc' } : { sort: key };
}

/** `key` (asc) or `key:desc`; empty string means the default order. */
export function leadSortValue({ sort, dir }: LeadSort): string {
  if (!sort) return '';
  return dir === 'desc' ? `${sort}:desc` : sort;
}

/** A select value → a sort; an unknown key falls back to the default order. */
export function leadSortFromValue(value: string): LeadSort {
  const [sort, dir] = value.split(':');
  return parseLeadSort(sort, dir);
}
