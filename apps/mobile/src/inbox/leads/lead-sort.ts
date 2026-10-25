import { LEAD_SORT_KEYS, type LeadSortKey } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** A lead list order (R-NFR-08), as the web inbox: no key = latest inbound message first. */
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

/** A select value → a sort; an unknown key falls back to the default order. */
export function leadSortFromValue(value: string): LeadSort {
  const [key, dir] = value.split(':');
  const sort = LEAD_SORT_KEYS.find((k) => k === key);
  if (!sort) return {};
  return dir === 'desc' ? { sort, dir: 'desc' } : { sort };
}

export function leadSortValue({ sort, dir }: LeadSort): string {
  if (!sort) return '';
  return dir === 'desc' ? `${sort}:desc` : sort;
}
