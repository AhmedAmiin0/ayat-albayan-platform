import { t } from '@ab/mobile-kit';

/** Values are `key` (asc) or `key:desc`; empty string is the default order. */
export const leadSortChoices = (): { value: string; label: string }[] => [
  { value: '', label: t.leads.sort.recent },
  { value: 'last_inbound', label: t.leads.sort.waiting },
  { value: 'created_at:desc', label: t.leads.sort.newest },
  { value: 'created_at', label: t.leads.sort.oldest },
  { value: 'name', label: t.leads.sort.name },
  { value: 'status', label: t.leads.sort.status },
  { value: 'source', label: t.leads.sort.source },
];
