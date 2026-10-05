import { LEAD_SOURCES } from '@ab/shared';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { LeadOrderFilters } from './LeadOrderFilters';
import type { LeadSearch } from './types';

export interface LeadsToolbarProps {
  search: LeadSearch;
  /** A filter patch; the inbox resets to page 1 and drops blank values. */
  onFilter: (patch: Record<string, unknown>) => void;
}

/**
 * Search by name / phone (Enter submits), the source and «مسؤول المبيعات» filters and the order,
 * all server-side (GET /leads q, source, assignee, sort / dir).
 */
export function LeadsToolbar({ search, onFilter }: LeadsToolbarProps) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <form
        role="search"
        // Re-mount on URL change (back button) so the box shows the active search.
        key={search.q ?? ''}
        className="relative flex-[1_1_100%] sm:max-w-[340px] sm:flex-[1_1_260px]"
        onSubmit={(e) => {
          e.preventDefault();
          onFilter({ q: new FormData(e.currentTarget).get('q') });
        }}
      >
        <Icon
          name="search"
          className="pointer-events-none absolute start-[11px] top-1/2 -translate-y-1/2 text-ink-3"
        />
        <Input
          type="search"
          name="q"
          defaultValue={search.q}
          aria-label={t.common.search}
          placeholder={t.leads.searchPlaceholder}
          className="ps-9"
        />
      </form>
      <Select
        aria-label={t.leads.source}
        value={search.source ?? ''}
        onChange={(e) => onFilter({ source: e.target.value })}
        className="w-auto min-w-0 flex-1 max-sm:basis-[40%] sm:min-w-[150px] sm:flex-none"
      >
        <option value="">{t.leads.sourceAll}</option>
        {LEAD_SOURCES.map((s) => (
          <option key={s} value={s}>
            {t.enums.leadSource[s]}
          </option>
        ))}
      </Select>
      <LeadOrderFilters search={search} onFilter={onFilter} />
    </div>
  );
}
