import { useQuery } from '@tanstack/react-query';
import { ColumnFilterText } from '@/components/ColumnFilterText';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { salesPeopleQuery } from '@/features/sales/api';
import { t } from '@/lib/i18n/i18n';
import { LeadFilterFields } from './LeadFilterFields';
import { CLEAR_LEAD_FILTERS, leadFilterChips } from './lead-filters';
import type { LeadSearch } from './types';

export interface LeadsToolbarProps {
  search: LeadSearch;
  /** A filter patch; the inbox resets to page 1 and drops blank values. */
  onFilter: (patch: Record<string, unknown>) => void;
  /** The leads the filters leave: «عرض النتائج (14)». */
  total?: number | undefined;
}

/**
 * The shared table toolbar (owner, 2026-10-05): the name / phone search (GET /leads q, applied after
 * a pause or Enter), «تصفية» with the source, «مسؤول المبيعات» and the order, and their chips.
 * The status stays the fihris beside the list (R-LEAD-02, docs/07 §9).
 */
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
