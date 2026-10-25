import { SUBSCRIPTION_STATUSES, subscriptionStatusStyle, type SubscriptionView } from '@ab/shared';
import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useRenewalThreshold } from '@/payments/queries';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { SearchField } from '@/core/ui/form/SearchField';
import { subscriptionParams, type SubscriptionFilter } from '../payments/filters';
import { SubscriptionItem } from './SubscriptionItem';

const PILLS: FilterPill<SubscriptionFilter>[] = [
  { value: 'all', label: t.mobileMoney.filterAll },
  ...SUBSCRIPTION_STATUSES.map((s) => ({
    value: s,
    label: t.enums.subscriptionStatus[s],
    ...subscriptionStatusStyle[s],
  })),
  { value: 'partial', label: t.mobileMoney.filterPartial },
];

/** «الباقات»: GET /subscriptions with a status chip row and a server-side student-name search. */
export function SubscriptionsList() {
  const { color } = useTheme();
  const [filter, setFilter] = useState<SubscriptionFilter>('all');
  const [search, setSearch] = useState('');
  const threshold = useRenewalThreshold();
  const list = usePagedList<SubscriptionView>({
    path: '/subscriptions',
    params: subscriptionParams(filter, search),
  });
  const empty = search ? t.common.notFound : t.mobileMoney.subscriptionsEmpty;
  return (
    <>
      <SearchField onSearch={setSearch} label={t.mobileMoney.searchStudent} />
      <FilterPills items={PILLS} value={filter} onChange={setFilter} accessibilityLabel={t.mobileMoney.statusFilter} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SubscriptionItem sub={item} {...(threshold === undefined ? {} : { threshold })} />}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={empty} />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </>
  );
}
