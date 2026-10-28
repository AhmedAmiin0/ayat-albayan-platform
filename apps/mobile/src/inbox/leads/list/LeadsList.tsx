import { LEAD_STATUSES, type LeadStatus, leadStatusStyle } from '@ab/shared';
import { type ReactNode, useCallback, useState } from 'react';

import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { clockAt } from '../../shared/format';
import { activeFilterCount, leadListParams, NO_FILTERS, type LeadFilters } from './lead-filters';
import { LeadsFilterBar } from './LeadsFilterBar';
import { LeadRow } from './LeadRow';
import type { Lead } from '../../shared/types';
import { useClockCycle } from '@/core/lib/clock';

type Filter = 'all' | LeadStatus;

const keyOf = (lead: Lead) => lead.id;

const filterPills = (): FilterPill<Filter>[] => [
  { value: 'all', label: t.leads.filterAll },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: t.enums.leadStatus[s], ...leadStatusStyle[s] })),
];

/**
 * The leads pipeline (R-MOB-02 inbox, R-MOB-03 offline): GET /leads by status, name/phone search,
 * source, owner and order (default newest inbound first). The API returns only the selected filter's total, so only that pill counts.
 */
export function LeadsList({ switcher }: { switcher: ReactNode }) {
  const cycle = useClockCycle();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Filter>('all');
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const list = usePagedList<Lead>({ path: '/leads', params: leadListParams({ q, status, filters }) });
  // The rows' clock: moves on every fetch (a refresh, a refocus), so «منذ دقيقة» does not stay forever.
  // Never before the list opened (a saved page's fetch time can be old); read once, render stays pure.
  const [opened] = useState(() => Date.now());
  const now = Math.max(opened, list.dataUpdatedAt);
  const renderRow = useCallback(({ item }: { item: Lead }) => <LeadRow lead={item} now={now} />, [now]);
  const filtersOn = q !== '' || status !== 'all' || activeFilterCount(filters) > 0;
  const loaded = list.data !== undefined;
  const pills = filterPills().map((p) => (loaded && p.value === status ? { ...p, count: list.total } : p));
  const showing = t.common.showing
    .replace('{shown}', String(list.items.length))
    .replace('{total}', String(list.total));
  // Offline (no NetInfo): the refetch failed but the saved list is on screen; say how old it is.
  const stale = list.isError && loaded;
  const subtitle = stale
    ? `${showing} · ${t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle))}`
    : loaded
      ? showing
      : undefined;

  return (
    <>
      <ScreenHeader title={t.leads.title} subtitle={subtitle} />
      {switcher}
      <SearchField onSearch={setQ} label={t.leads.searchPlaceholder} />
      <LeadsFilterBar filters={filters} onChange={setFilters} total={loaded ? list.total : undefined} />
      <FilterPills items={pills} value={status} onChange={setStatus} accessibilityLabel={t.leads.status} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
        extraData={now}
        ListEmptyComponent={
          list.isPending ? null : loaded ? <EmptyState title={filtersOn ? t.mobileLeads.noMatch : t.leads.empty} /> : <ErrorState onRetry={list.refresh} />
        }
      />
    </>
  );
}
