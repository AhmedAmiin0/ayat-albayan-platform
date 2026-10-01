import { LEAD_STATUSES, leadStatusStyle, type LeadStatus } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { formatPhoneDisplay } from '@/lib/phone';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { StatusChip } from '@/ui/StatusChip';
import { clockAt, leadAge } from './format';
import type { Lead } from './types';

type Filter = 'all' | LeadStatus;

const PILLS: FilterPill<Filter>[] = [
  { value: 'all', label: t.leads.filterAll },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: t.enums.leadStatus[s], ...leadStatusStyle[s] })),
];

/**
 * «كل المحادثات» (R-MOB-02 inbox, R-MOB-03 offline): GET /leads by status and name/phone search,
 * newest inbound first. The API returns only the selected filter's total, so only that pill counts.
 * TODO(R-MOB-02): avatar initial (ListRow has no leading slot yet), unread dot, last message line.
 */
export function InboxScreen() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Filter>('all');
  const list = usePagedList<Lead>({
    path: '/leads',
    params: { q, status: status === 'all' ? undefined : status },
  });
  const loaded = list.data !== undefined;
  const pills = PILLS.map((p) => (loaded && p.value === status ? { ...p, count: list.total } : p));
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
    <Screen>
      <ScreenHeader title={t.leads.title} subtitle={subtitle} />
      <SearchField onSearch={setQ} label={t.leads.searchPlaceholder} />
      <FilterPills
        items={pills}
        value={status}
        onChange={setStatus}
        accessibilityLabel={t.leads.status}
      />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(lead) => lead.id}
        renderItem={({ item }) => {
          const phone = formatPhoneDisplay(item.phone_e164);
          return (
            <ListRow
              title={item.name ?? ltr(phone)}
              meta={item.name ? phone : undefined}
              subtitle={`${t.enums.leadSource[item.source]} · ${leadAge(item.created_at)}`}
              trailing={
                <StatusChip
                  {...leadStatusStyle[item.status]}
                  label={t.enums.leadStatus[item.status]}
                  size="sm"
                />
              }
              onPress={() => router.push(`/inbox/${item.id}`)}
            />
          );
        }}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.isPending ? null : loaded ? (
            <EmptyState title={t.leads.empty} />
          ) : (
            <ErrorState onRetry={() => void list.refetch()} />
          )
        }
      />
    </Screen>
  );
}
