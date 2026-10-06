import { formatPhone, LEAD_STATUSES, type LeadStatus, leadStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { StatusChip } from '@/ui/StatusChip';
import { clockAt, initialOf } from './format';
import { leadListParams, NO_FILTERS, type LeadFilters } from './leads/lead-filters';
import { LeadsFilterBar } from './leads/LeadsFilterBar';
import { leadRowSubtitle } from './leads/lead-row';
import { leadStatusChip } from './lead-words';
import type { Lead } from './types';

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
  const list = usePagedList<Lead>({ path: '/leads', params: leadListParams({ q, status, filters }) });
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
          list.isPending ? null : loaded ? <EmptyState title={t.leads.empty} /> : <ErrorState onRetry={list.refresh} />
        }
      />
    </>
  );
}
