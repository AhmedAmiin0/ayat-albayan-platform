import { formatPhone, LEAD_STATUSES, type LeadStatus, leadStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ltr } from '@/core/ui/primitives/Ltr';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { clockAt, initialOf } from '../../shared/format';
import { activeFilterCount, leadListParams, NO_FILTERS, type LeadFilters } from './lead-filters';
import { LeadsFilterBar } from './LeadsFilterBar';
import { leadRowSubtitle } from './lead-row';
import { leadStatusChip } from '../detail/lead-words';
import type { Lead } from '../../shared/types';

type Filter = 'all' | LeadStatus;

const filterPills = (): FilterPill<Filter>[] => [
  { value: 'all', label: t.leads.filterAll },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: t.enums.leadStatus[s], ...leadStatusStyle[s] })),
];

/**
 * The leads pipeline (R-MOB-02 inbox, R-MOB-03 offline): GET /leads by status, name/phone search,
 * source, owner and order (default newest inbound first). The API returns only the selected filter's total, so only that pill counts.
 */
export function LeadsList({ switcher }: { switcher: ReactNode }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Filter>('all');
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const inset = useTabBarInset();
  const list = usePagedList<Lead>({ path: '/leads', params: leadListParams({ q, status, filters }) });
  const filtersOn = q !== '' || status !== 'all' || activeFilterCount(filters) > 0;
  const loaded = list.data !== undefined;
  const pills = filterPills().map((p) => (loaded && p.value === status ? { ...p, count: list.total } : p));
  const showing = t.common.showing
    .replace('{shown}', String(list.items.length))
    .replace('{total}', String(list.total));
  // Offline (no NetInfo): the refetch failed but the saved list is on screen; say how old it is.
  const stale = list.isError && loaded;
  const subtitle = stale
    ? `${showing} · ${t.mobile.lastUpdated.replace('{time}', clockAt(list.dataUpdatedAt))}`
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
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={list.items}
        keyExtractor={(lead) => lead.id}
        renderItem={({ item }) => {
          const phone = formatPhone(item.phone_e164);
          return (
            <ListRow
              leading={<Avatar letter={initialOf(item.name)} />}
              title={item.name ?? ltr(phone)}
              meta={item.name ? phone : undefined}
              subtitle={leadRowSubtitle(item)}
              trailing={<StatusChip {...leadStatusChip(item.status)} size="sm" />}
              onPress={() => router.push(`/inbox/${item.id}`)}
            />
          );
        }}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.isPending ? null : loaded ? <EmptyState title={filtersOn ? t.mobileLeads.noMatch : t.leads.empty} /> : <ErrorState onRetry={list.refresh} />
        }
      />
    </>
  );
}
