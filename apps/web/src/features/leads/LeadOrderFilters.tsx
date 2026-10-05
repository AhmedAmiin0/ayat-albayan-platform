import { NO_ASSIGNEE } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';
import { salesPeopleQuery } from '@/features/sales/api';
import { t } from '@/lib/i18n';
import { leadSortChoices, leadSortFromValue, leadSortValue } from './lead-sort';
import type { LeadSearch } from './types';

export interface LeadOrderFiltersProps {
  search: LeadSearch;
  /** A filter patch; the inbox resets to page 1 and drops blank values. */
  onFilter: (patch: Record<string, unknown>) => void;
}

// Phones: two selects per row (40% + 40% + gaps), the third on a row of its own; never cut short.
const selectClass = 'w-auto min-w-0 flex-1 max-sm:basis-[40%] sm:min-w-[150px] sm:flex-none';

/**
 * The inbox is a card list, not a table: its «الترتيب» select (server-side, R-NFR-08) and the
 * «مسؤول المبيعات» filter (R-LEAD-05) sit in the toolbar beside the source filter.
 */
export function LeadOrderFilters({ search, onFilter }: LeadOrderFiltersProps) {
  const people = useQuery(salesPeopleQuery);
  const options = Array.isArray(people.data) ? people.data : [];
  return (
    <>
      <Select
        aria-label={t.sales.assign.label}
        value={search.assignee ?? ''}
        onChange={(e) => onFilter({ assignee: e.target.value })}
        className={selectClass}
      >
        <option value="">{t.leads.assigneeAll}</option>
        <option value={NO_ASSIGNEE}>{t.sales.assign.none}</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t.leads.sortBy}
        value={leadSortValue(search)}
        onChange={(e) => onFilter({ sort: undefined, dir: undefined, ...leadSortFromValue(e.target.value) })}
        className={selectClass}
      >
        {leadSortChoices().map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </>
  );
}
