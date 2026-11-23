import { LEAD_STATUSES, type LeadStatus, leadStatusStyle } from '@ab/shared';
import { type ReactNode, useCallback, useState } from 'react';
import { View } from 'react-native';
import type { LeadView } from '@ab/shared';

import {
  t,
  EmptyState,
  ErrorState,
  FilterPills,
  type FilterPill,
  ScreenHeader,
} from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { SearchField } from '@/core/ui/form/SearchField';
import { clockAt } from '@/inbox/shared/format';
import { activeFilterCount, leadListParams, NO_FILTERS, type LeadFilters } from '@/inbox/leads/list/lead-filters';
import { LeadsFilterBar } from '@/inbox/leads/list/LeadsFilterBar';
import { LeadRow } from '@/inbox/leads/list/LeadRow';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

type Filter = 'all' | LeadStatus;

const keyOf = (lead: LeadView) => lead.id;

const filterPills = (): FilterPill<Filter>[] => [
  { value: 'all', label: t.leads.filterAll },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: t.enums.leadStatus[s], ...leadStatusStyle[s] })),
];

/**
 * The leads pipeline (R-MOB-02 inbox, R-MOB-03 offline): GET /leads by status, name/phone search,
 * source, owner and order (default newest inbound first). The API returns only the selected filter's total, so only that pill counts.
 * The list screens' one compact top (owner 2026-10-28), as the chats: «… · 107» on the title's line, the
 * pill search, ONE row («تصفية» then the status pills), 8pt apart; the rows in the inset card.
 */
export function LeadsList({ switcher }: { switcher: ReactNode }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Filter>('all');
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const list = usePagedList<LeadView>({ path: '/leads', params: leadListParams({ q, status, filters }) });
  // The rows' clock: moves on every fetch (a refresh, a refocus), so «منذ دقيقة» does not stay forever.
  // Never before the list opened (a saved page's fetch time can be old); read once, render stays pure.
  const [opened] = useState(() => Date.now());
  const now = Math.max(opened, list.dataUpdatedAt);
  const renderRow = useCallback(({ item }: { item: LeadView }) => <LeadRow lead={item} now={now} />, [now]);
  const filtersOn = q !== '' || status !== 'all' || activeFilterCount(filters) > 0;
  const loaded = list.data !== undefined;
  const pills = filterPills().map((p) => (loaded && p.value === status ? { ...p, count: list.total } : p));
  // Offline (no NetInfo): the refetch failed but the saved list is on screen; say how old it is.
  const stale = list.isError && loaded;
  const subtitle = stale ? t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt, cycle, tz)) : undefined;

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <ScreenHeader title={t.leads.title} size="h2" connecting count={loaded ? list.total : undefined} subtitle={subtitle} />
      {switcher}
      <SearchField compact onSearch={setQ} label={t.leads.searchPlaceholder} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LeadsFilterBar filters={filters} onChange={setFilters} total={loaded ? list.total : undefined} />
        <View style={{ flex: 1 }}>
          <FilterPills items={pills} value={status} onChange={setStatus} accessibilityLabel={t.leads.status} />
        </View>
      </View>
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
        extraData={now}
        ListEmptyComponent={
          list.isPending ? null : loaded ? <EmptyState title={filtersOn ? t.mobileLeads.noMatch : t.leads.empty} /> : <ErrorState onRetry={list.refresh} />
        }
      />
    </View>
  );
}
