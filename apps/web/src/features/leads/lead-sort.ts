import { LEAD_SORT_KEYS, type LeadSortKey } from '@ab/shared';
import { t } from '@/lib/i18n';

/** A lead list order (R-NFR-08): no key = the inbox default, latest inbound message first. */
export type LeadSort = { sort?: LeadSortKey; dir?: 'desc' };

/** The «الترتيب» choices: `key` (asc) or `key:desc`; '' = the default order. */
export const leadSortChoices = (): { value: string; label: string }[] => [
  { value: '', label: t.leads.sort.recent },
  { value: 'last_inbound', label: t.leads.sort.waiting },
  { value: 'created_at:desc', label: t.leads.sort.newest },
  { value: 'created_at', label: t.leads.sort.oldest },
  { value: 'name', label: t.leads.sort.name },
  { value: 'status', label: t.leads.sort.status },
  { value: 'source', label: t.leads.sort.source },
];

/** URL / select value → sort; unknown keys → the default. */
export function parseLeadSort(sort: unknown, dir: unknown): LeadSort {
  const key = LEAD_SORT_KEYS.find((k) => k === sort);
  if (!key) return {};
  return dir === 'desc' ? { sort: key, dir: 'desc' } : { sort: key };
}

export function leadSortValue({ sort, dir }: LeadSort): string {
  if (!sort) return '';
  return dir === 'desc' ? `${sort}:desc` : sort;
}

export function leadSortFromValue(value: string): LeadSort {
  const [sort, dir] = value.split(':');
  return parseLeadSort(sort, dir);
}
