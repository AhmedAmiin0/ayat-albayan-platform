import { SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { subscriptionStatusStyle, type SubscriptionView } from '@ab/money';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { t, useTheme, EmptyState, ErrorState, FilterPills, type FilterPill } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useRenewalThreshold } from '@/payments/hooks/queries';
import { LazyList } from '@/core/ui/lists/LazyList';
import { SearchField } from '@/core/ui/form/SearchField';
import type { SubscriptionFilter } from '@ab/client-core';
import { subscriptionParams } from '@/money/payments/filters';
import { SubscriptionItem } from './SubscriptionItem';

const PILLS: FilterPill<SubscriptionFilter | 'all'>[] = [
  { value: 'all', label: t.mobileMoney.filterAll },
  ...SUBSCRIPTION_STATUSES.map((s) => ({
    value: s,
    label: t.enums.subscriptionStatus[s],
    ...subscriptionStatusStyle[s],
  })),
  { value: 'partial', label: t.mobileMoney.filterPartial },
];

const keyOf = (s: SubscriptionView) => s.id;

/** «الباقات»: GET /subscriptions with a status chip row and a server-side student-name search. */
export function SubscriptionsList() {
  const { color } = useTheme();
  const [filter, setFilter] = useState<SubscriptionFilter | 'all'>('all');
  const [search, setSearch] = useState('');
  const threshold = useRenewalThreshold();
  const list = usePagedList<SubscriptionView>({
    path: '/subscriptions',
    params: subscriptionParams(filter, search),
  });
  // A new threshold redraws the rows (it is in their chip); a refetch of one page does not. Keyed by the
  // package: FlashList recycles a row, which would carry an open «إلغاء الباقة» confirm onto another one.
  const renderItem = useCallback(
    ({ item }: { item: SubscriptionView }) => (
      <SubscriptionItem key={item.id} sub={item} {...(threshold === undefined ? {} : { threshold })} />
    ),
    [threshold],
  );
  const empty = search ? t.common.notFound : t.mobileMoney.subscriptionsEmpty;
  return (
    <>
      <SearchField compact onSearch={setSearch} label={t.mobileMoney.searchStudent} />
      <FilterPills items={PILLS} value={filter} onChange={setFilter} accessibilityLabel={t.mobileMoney.statusFilter} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderItem}
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
