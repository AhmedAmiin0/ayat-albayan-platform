import { useQuery } from '@tanstack/react-query';
import { ColumnFilterText } from '@/components/data-table/ColumnFilterText';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { salesPeopleQuery } from '@/features/sales/sales/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LeadFilterFields } from './LeadFilterFields';
import { CLEAR_LEAD_FILTERS, leadFilterChips } from './lead-filters';
import type { LeadSearch } from '@/features/sales/leads/types';

export interface LeadsToolbarProps {
  search: LeadSearch;
  /** A filter patch; the inbox resets to page 1 and drops blank values. */
  onFilter: (patch: Record<string, unknown>) => void;
  total?: number | undefined;
}

/** Search applies after a pause or Enter; status stays the side index (R-LEAD-02, docs/07 §9). */
export function LeadsToolbar({ search, onFilter, total }: LeadsToolbarProps) {
  const people = useQuery(salesPeopleQuery);
  const list = Array.isArray(people.data) ? people.data : [];
  const options = { search, people: list, onFilter };
  return (
    <TableToolbar
      search={
        <ColumnFilterText
          ariaLabel={t.common.search}
          placeholder={t.leads.searchPlaceholder}
          value={search.q ?? ''}
          onChange={(q) => onFilter({ q })}
        />
      }
      fields={<LeadFilterFields {...options} />}
      chips={leadFilterChips(options)}
      onClearAll={() => onFilter(CLEAR_LEAD_FILTERS)}
      resultCount={total}
    />
  );
}
