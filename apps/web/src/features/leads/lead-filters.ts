import { NO_ASSIGNEE } from '@ab/shared';
import { chipIfSet } from '@/components/table-toolbar/fields';
import type { FilterChip } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n';
import { leadSortChoices, leadSortValue } from './lead-sort';
import type { LeadSearch } from './types';

export interface LeadChipsOptions {
  search: LeadSearch;
  /** The salespeople, for the assignee chip's name. */
  people: readonly { id: string; name: string }[];
  /** A filter patch (page 1, blank values dropped). */
  onFilter: (patch: Record<string, unknown>) => void;
}

/** What the assignee chip says: «بدون مسؤول», the salesperson's name (the id is never shown). */
function assigneeText(assignee: string | undefined, people: LeadChipsOptions['people']): string | undefined {
  if (!assignee) return undefined;
  if (assignee === NO_ASSIGNEE) return t.sales.assign.none;
  return people.find((p) => p.id === assignee)?.name ?? t.common.loading;
}

/** The set source, assignee and order of the inbox as removable chips (the status is the fihris beside the list). */
export function leadFilterChips({ search, people, onFilter }: LeadChipsOptions): FilterChip[] {
  const sort = leadSortValue(search);
  return [
    ...chipIfSet({
      id: 'source',
      label: t.leads.source,
      value: search.source,
      text: search.source && t.enums.leadSource[search.source],
      onRemove: () => onFilter({ source: undefined }),
    }),
    ...chipIfSet({
      id: 'assignee',
      label: t.sales.assign.label,
      value: search.assignee,
      text: assigneeText(search.assignee, people),
      onRemove: () => onFilter({ assignee: undefined }),
    }),
    ...chipIfSet({
      id: 'sort',
      label: t.leads.sortBy,
      value: sort,
      text: leadSortChoices().find((c) => c.value === sort)?.label,
      onRemove: () => onFilter({ sort: undefined, dir: undefined }),
    }),
  ];
}

/** «مسح الكل»: the source, assignee and order (the search box keeps its text, like the tables). */
export const CLEAR_LEAD_FILTERS = { source: undefined, assignee: undefined, sort: undefined, dir: undefined };
